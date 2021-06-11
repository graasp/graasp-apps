import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fastifyBearerAuth from 'fastify-bearer-auth';
import { promisify } from 'util';
import fastifyJwt from 'fastify-jwt';
import fastifyAuth from 'fastify-auth';

import appDataPlugin from './app-data/service-api';
import appActionPlugin from './app-actions/service-api';

import { AuthTokenSubject } from './interfaces/request';
import { createSchema, updateSchema } from './fluent-schema';
import common, { generateToken, getContext } from './schemas';
import { AppIdentification } from './interfaces/app-details';
import { AppDataService } from './app-data/db-service';
import { AppActionService } from './app-actions/db-service';
import { GenerateApiAccessTokenSujectTask } from './app-data/tasks/generate-api-access-token-subject';
import { GetContextTask } from './app-data/tasks/get-context-task';

declare module 'fastify' {
  interface FastifyInstance {
    appDataService: AppDataService,
    appActionService: AppActionService
  }
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
  const { jwtSecret: JWT_SECRET, jwtExpiration: JWT_EXPIRATION = 30 } = options;

  const {
    items: { dbService: iS, extendCreateSchema, extendExtrasUpdateSchema },
    itemMemberships: { dbService: iMS },
    taskRunner: runner
  } = fastify;

  // "install" custom schema for validating document items creation
  extendCreateSchema(createSchema);
  // "install" custom schema for validating document items update
  extendExtrasUpdateSchema(updateSchema);

  const aDS = new AppDataService();
  fastify.decorate('appDataService', aDS);
  const aAS = new AppActionService();
  fastify.decorate('appActionService', aAS);

  fastify.addSchema(common);

  // register auth plugin
  // jwt plugin to manipulate jwt token
  await fastify.register(fastifyJwt, { secret: JWT_SECRET });

  const promisifiedJwtVerify = promisify<string, { sub: AuthTokenSubject }>(fastify.jwt.verify);
  async function validateApiAccessToken(jwtToken: string, request: FastifyRequest) {
    try {
      // verify token and extract its data
      const { sub } = await promisifiedJwtVerify(jwtToken);

      // TODO: check if origin in token matches request's origin ?
      // (Origin header is only present in CORS request: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin)
      request.authTokenSubject = sub;
      return true;
    } catch (error) {
      const { log } = request;
      log.warn('Invalid api access token');
      return false;
    }
  }

  // bearer token plugin to read and validate token in Bearer header
  fastify.decorateRequest('authTokenSubject', null);
  fastify.register(fastifyBearerAuth,
    { addHook: false, keys: new Set<string>(), auth: validateApiAccessToken });

  // API endpoints
  fastify.register(async function (fastify) {
    // requires valid member (cookie-based) session
    fastify.addHook('preHandler', fastify.validateSession);

    const promisifiedJwtSign = promisify<{ sub: AuthTokenSubject }, { expiresIn: string }, string>(fastify.jwt.sign);

    // generate api access token for member + (app-)item.
    fastify.post<{ Params: { itemId: string }; Body: { origin: string } & AppIdentification }>(
      '/:itemId/app-api-access-token', { schema: generateToken },
      async ({ member, params: { itemId }, body, log }) => {
        const task = new GenerateApiAccessTokenSujectTask(member, itemId, body, aDS, iS, iMS);
        const authTokenSubject = await runner.runSingle(task, log);
        const token = await promisifiedJwtSign({ sub: authTokenSubject }, { expiresIn: `${JWT_EXPIRATION}m` });
        return { token };
      }
    );
  });

  fastify.register(async function (fastify) {
    await fastify.register(fastifyAuth);

    // get app item context
    // (endpoint accessible both with token and session cookie)
    fastify.get<{ Params: { itemId: string } }>(
      '/:itemId/context',
      {
        schema: getContext,
        // endpoint accessible with cookie or bearer token
        preHandler: fastify.auth([fastify.validateSession, fastify.verifyBearerAuth])
      },
      async ({ member, authTokenSubject: requestDetails, params: { itemId }, log }) => {
        const memberId = member ? member.id : requestDetails.member;
        const task = new GetContextTask({ id: memberId }, itemId, requestDetails, aDS, iS, iMS);
        return runner.runSingle(task, log);
      }
    );
  });

  // register app data plugin
  fastify.register(appDataPlugin);

  // register app action plugin
  fastify.register(appActionPlugin);
};

export default plugin;
