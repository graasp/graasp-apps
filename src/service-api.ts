// global
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fastifyBearerAuth from 'fastify-bearer-auth';
import { promisify } from 'util';
import fastifyJwt from 'fastify-jwt';
import fastifyAuth from 'fastify-auth';

import { IdParam } from 'graasp';
// local
import { AppData, InputAppData } from './interfaces/app-data';
import { AppIdentification } from './interfaces/app-details';
import common, {
  generateToken,
  updateSchema,
  createSchema,
  create,
  updateOne,
  deleteOne,
  getForOne,
  getForMany,
  getContext
} from './schemas';
import { AuthTokenSubject, ManyItemsGetFilter, SingleItemGetFilter } from './interfaces/request';
import { TaskManager } from './task-manager';
import { AppDataService } from './db-service';

declare module 'fastify' {
  interface FastifyRequest {
    authTokenSubject: AuthTokenSubject;
  }
}

interface AppsPluginOptions {
  jwtSecret: string;
  /** In minutes. Defaults to 30 (minutes) */
  jwtExpiration?: number;
}

const plugin: FastifyPluginAsync<AppsPluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS, extendCreateSchema, extendExtrasUpdateSchema },
    itemMemberships: { dbService: iMS },
    taskRunner: runner
  } = fastify;
  const { jwtSecret: JWT_SECRET, jwtExpiration: JWT_EXPIRATION = 30 } = options;

  const aDS = new AppDataService();
  const taskManager = new TaskManager(aDS, iS, iMS);

  // "install" custom schema for validating document items creation
  extendCreateSchema(createSchema);
  // "install" custom schema for validating document items update
  extendExtrasUpdateSchema(updateSchema);

  fastify.addSchema(common);

  await fastify.register(fastifyJwt, { secret: JWT_SECRET });

  // endpoint(s) not accessible to third-parties - graasp session necessary
  fastify.register(async function (fastify) {
    // requires valid member (cookie-based) session
    fastify.addHook('preHandler', fastify.validateSession);

    const promisifiedJwtSign = promisify<{ sub: AuthTokenSubject }, { expiresIn: string }, string>(fastify.jwt.sign);

    // generate api access token for member + (app-)item.
    fastify.post<{ Params: { itemId: string }; Body: { origin: string } & AppIdentification }>(
      '/:itemId/app-api-access-token', { schema: generateToken },
      async ({ member, params: { itemId }, body, log }) => {
        const task = taskManager.createGenerateApiAccessTokenSubjectTask(member, itemId, body);
        const authTokenSubject = await runner.runSingle(task, log);
        const token = await promisifiedJwtSign({ sub: authTokenSubject }, { expiresIn: `${JWT_EXPIRATION}m` });
        return { token };
      }
    );
  });

  // TODO: think about an app doing a normal login to get a token - when app loads alone, without the container.
  // (!) not very doable because there's no item context at all to check permission or
  // to know where ("under" what)to save the app data

  const promisifiedJwtVerify = promisify<string, { sub: AuthTokenSubject }>(fastify.jwt.verify);

  async function validateApiAccessToken(jwtToken: string, request: FastifyRequest) {
    try {
      // verify and extract token's data
      const { sub } = await promisifiedJwtVerify(jwtToken);

      // TODO: check if origin in token matches request's origin ? (Origin header is only present in CORS request: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin)

      request.authTokenSubject = sub;
      return true;
    } catch (error) {
      const { log } = request;
      log.warn('Invalid api access token');
      return false;
    }
  }

  // endpoints accessible to third parties
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.decorateRequest('authTokenSubject', null);

    // requires valid api access token
    fastify.register(fastifyBearerAuth, { keys: new Set<string>(), auth: validateApiAccessToken });

    // create app data
    fastify.post<{ Params: { itemId: string }; Body: Partial<InputAppData> }>(
      '/:itemId/app-data', { schema: create },
      async ({ authTokenSubject: requestDetails, params: { itemId }, body, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createCreateTask({ id }, body, itemId, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // update app data
    fastify.patch<{ Params: { itemId: string } & IdParam; Body: Partial<AppData> }>(
      '/:itemId/app-data/:id', { schema: updateOne },
      async ({ authTokenSubject: requestDetails, params: { itemId, id: appDataId }, body, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createUpdateTask({ id }, appDataId, body, itemId, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // delete app data
    fastify.delete<{ Params: { itemId: string } & IdParam }>(
      '/:itemId/app-data/:id', { schema: deleteOne },
      async ({ authTokenSubject: requestDetails, params: { itemId, id: appDataId }, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createDeleteTask({ id }, appDataId, itemId, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // get app data
    fastify.get<{ Params: { itemId: string }, Querystring: SingleItemGetFilter }>(
      '/:itemId/app-data', { schema: getForOne },
      async ({ authTokenSubject: requestDetails, params: { itemId }, query: filter, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetTask({ id }, itemId, filter, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // get app data from multiple items
    fastify.get<{ Querystring: ManyItemsGetFilter }>(
      '/app-data', { schema: getForMany },
      async ({ authTokenSubject: requestDetails, query: filter, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetItemsAppDataTask({ id }, filter, requestDetails);
        return runner.runSingle(task, log);
      }
    );
  });

  fastify.register(async function (fastify) {
    await fastify
      .register(fastifyAuth)
      .decorateRequest('authTokenSubject', null)
      .register(fastifyBearerAuth,
        { addHook: false, keys: new Set<string>(), auth: validateApiAccessToken });

    // get app item context
    fastify.get<{ Params: { itemId: string } }>(
      '/:itemId/context',
      {
        schema: getContext,
        // endpoint accessible with cookie or bearer token
        preHandler: fastify.auth([fastify.validateSession, fastify.verifyBearerAuth])
      },
      async ({ member, authTokenSubject: requestDetails, params: { itemId }, log }) => {
        const memberId = member ? member.id : requestDetails.member;
        const task = taskManager.createGetContextTask({ id: memberId }, itemId, requestDetails);
        return runner.runSingle(task, log);
      }
    );
  });
};

export default plugin;
