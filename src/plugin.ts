import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fastifyBearerAuth from 'fastify-bearer-auth';
import { promisify } from 'util';
import fastifyJwt from 'fastify-jwt';
import fastifyAuth from 'fastify-auth';
import fastifyCors from 'fastify-cors';

import appDataPlugin from './app-data/service-api';
import appActionPlugin from './app-actions/service-api';

import { AuthTokenSubject } from './interfaces/request';
import { getMany, createSchema, updateSchema } from './fluent-schema';
import common, { generateToken, getContext } from './schemas';
import { AppIdentification } from './interfaces/app-details';
import { AppDataService } from './app-data/db-service';
import { GenerateApiAccessTokenSujectTask } from './app-data/tasks/generate-api-access-token-subject';
import { GetContextTask } from './app-data/tasks/get-context-task';
import { AppService } from './db-service';
import { GetAppListTask } from './tasks/get-app-list-task';

declare module 'fastify' {
  interface FastifyInstance {
    appDataService: AppDataService
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

const ROUTES_PREFIX = '/app-items';

const plugin: FastifyPluginAsync<AppsPluginOptions> = async (fastify, options) => {
  const { jwtSecret, jwtExpiration = 30 } = options;

  const {
    items: { dbService: iS, extendCreateSchema, extendExtrasUpdateSchema },
    itemMemberships: { dbService: iMS },
    taskRunner: runner, db
  } = fastify;

  // "install" custom schema for validating document items creation
  extendCreateSchema(createSchema);
  // "install" custom schema for validating document items update
  extendExtrasUpdateSchema(updateSchema);

  const aDS = new AppDataService();
  fastify.decorate('appDataService', aDS);

  fastify.addSchema(common);

  // register auth plugin
  // jwt plugin to manipulate jwt token
  await fastify.register(fastifyJwt, { secret: jwtSecret });

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
      log.warn('Invalid app api access token');
      return false;
    }
  }

  // bearer token plugin to read and validate token in Bearer header
  fastify.decorateRequest('authTokenSubject', null);
  fastify.register(fastifyBearerAuth,
    { addHook: false, keys: new Set<string>(), auth: validateApiAccessToken });

  // API endpoints
  fastify.register(async function (fastify) {
    // add CORS support that allows graasp's origin(s) + app publishers' origins.
    // TODO: not perfect because it's allowing apps' origins to call "/app-items/<id>/api-access-token",
    // even though they would not be able to fulfill the request because they need the
    // proper authentication
    const { corsPluginOptions } = fastify;

    if (corsPluginOptions) {
      const allowedOrigins = await aDS.getAllValidAppOrigins(db.pool);

      const graaspAndAppsOrigins = corsPluginOptions.origin.concat(allowedOrigins);
      fastify.register(fastifyCors,
        Object.assign({}, corsPluginOptions, { origin: graaspAndAppsOrigins }));
    }

    fastify.register(async function (fastify) {
      // requires authenticated member using web client (session cookie)
      // or using mobile app client (auth token)
      fastify.addHook('preHandler', fastify.verifyAuthentication);

      const aS = new AppService();
      fastify.decorate('appService', aS);

      fastify.get('/list', { schema: getMany }, async ({ member }) => {
        const task = new GetAppListTask(member, aS);
        return await runner.runSingle(task);
      });

      const promisifiedJwtSign = promisify<{ sub: AuthTokenSubject }, { expiresIn: string }, string>(fastify.jwt.sign);

      // generate api access token for member + (app-)item.
      fastify.post<{ Params: { itemId: string }; Body: { origin: string } & AppIdentification }>(
        '/:itemId/api-access-token', { schema: generateToken },
        async ({ member, params: { itemId }, body, log }) => {
          const task = new GenerateApiAccessTokenSujectTask(member, itemId, body, aDS, iS, iMS);
          const authTokenSubject = await runner.runSingle(task, log);
          const token = await promisifiedJwtSign({ sub: authTokenSubject }, { expiresIn: `${jwtExpiration}m` });
          return { token };
        }
      );
    });

    fastify.register(async function (fastify) {
      await fastify.register(fastifyAuth);

      // get app item context
      fastify.get<{ Params: { itemId: string } }>(
        '/:itemId/context',
        {
          schema: getContext,
          // for authenticated member using web client (session cookie),
          // using mobile app client (auth token),
          // or for third party app with an api bearer token (previously generated by the "container"
          // by calling /:itemId/app-api-access-token)
          preHandler: fastify.auth([fastify.verifyBearerAuth, fastify.verifyAuthentication])
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

  }, { prefix: ROUTES_PREFIX });
};

export default plugin;
