import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Item } from 'graasp';
import fastifyCors from 'fastify-cors';
import fastifyBearerAuth from 'fastify-bearer-auth';
import { promisify } from 'util';
import fastifyJwt from 'fastify-jwt';
import fastifyAuth from 'fastify-auth';
import ThumbnailsPlugin from 'graasp-plugin-thumbnails';
import { GraaspLocalFileItemOptions, GraaspS3FileItemOptions } from 'graasp-plugin-file';

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
import {
  APPS_TEMPLATE_PATH_PREFIX,
  DEFAULT_JWT_EXPIRATION,
  THUMBNAILS_ROUTE,
} from './util/constants';
import { AppsPluginOptions } from './types';

declare module 'fastify' {
  interface FastifyInstance {
    appDataService: AppDataService;
    s3FileItemPluginOptions?: GraaspS3FileItemOptions;
    fileItemPluginOptions?: GraaspLocalFileItemOptions;
  }
}

const plugin: FastifyPluginAsync<AppsPluginOptions> = async (fastify, options) => {
  const {
    jwtSecret,
    jwtExpiration = DEFAULT_JWT_EXPIRATION,
    serviceMethod,
    thumbnailsPrefix,
  } = options;

  const {
    items: { dbService: iS, taskManager: iTM, extendCreateSchema, extendExtrasUpdateSchema },
    itemMemberships: { dbService: iMS },
    taskRunner: runner,
    db,
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
  fastify.register(fastifyBearerAuth, {
    addHook: false,
    keys: new Set<string>(),
    auth: validateApiAccessToken,
  });

  // API endpoints
  fastify.register(async function (fastify) {
    // add CORS support that allows graasp's origin(s) + app publishers' origins.
    // TODO: not perfect because it's allowing apps' origins to call "/<id>/api-access-token",
    // even though they would not be able to fulfill the request because they need the
    // proper authentication
    const { corsPluginOptions } = fastify;
    if (corsPluginOptions) {
      const allowedOrigins = await aDS.getAllValidAppOrigins(db.pool);

      const graaspAndAppsOrigins = corsPluginOptions.origin.concat(allowedOrigins);
      fastify.register(
        fastifyCors,
        Object.assign({}, corsPluginOptions, { origin: graaspAndAppsOrigins }),
      );
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

      const promisifiedJwtSign = promisify<
        { sub: AuthTokenSubject },
        { expiresIn: string },
        string
      >(fastify.jwt.sign);

      // generate api access token for member + (app-)item.
      fastify.post<{ Params: { itemId: string }; Body: { origin: string } & AppIdentification }>(
        '/:itemId/api-access-token',
        { schema: generateToken },
        async ({ member, params: { itemId }, body, log }) => {
          const t1 = iTM.createGetTaskSequence(member, itemId);
          const t2 = new GenerateApiAccessTokenSujectTask(member, aDS, iS, iMS, {
            appDetails: body,
          });
          t2.getInput = () => ({ item: t1[t1.length - 1].getResult() as Item });
          const authTokenSubject = (await runner.runSingleSequence(
            [...t1, t2],
            log,
          )) as AuthTokenSubject;
          const token = await promisifiedJwtSign(
            { sub: authTokenSubject },
            { expiresIn: `${jwtExpiration}m` },
          );
          return { token };
        },
      );

      // register thumbnail plugin for creation hook
      fastify.register(ThumbnailsPlugin, {
        serviceMethod: serviceMethod,
        serviceOptions: {
          s3: fastify.s3FileItemPluginOptions,
          local: fastify.fileItemPluginOptions,
        },
        pathPrefix: APPS_TEMPLATE_PATH_PREFIX,
        enableAppsHooks: {
          appsTemplateRoot: APPS_TEMPLATE_PATH_PREFIX,
          itemsRoot: thumbnailsPrefix,
        },
        uploadPreHookTasks: async (_id, _args) => {
          throw new Error('The upload endpoint is not implemented');
        },
        downloadPreHookTasks: async (_payload, _args) => {
          throw new Error('The download endpoint is not implemented');
        },

        prefix: THUMBNAILS_ROUTE,
      });
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
          preHandler: fastify.auth([fastify.verifyBearerAuth, fastify.verifyAuthentication]),
        },
        async ({ member, authTokenSubject: requestDetails, params: { itemId }, log }) => {
          const memberId = member ? member.id : requestDetails.member;
          const task = new GetContextTask({ id: memberId }, itemId, requestDetails, aDS, iS, iMS);
          return runner.runSingle(task, log);
        },
      );
    });

    // register app data plugin
    fastify.register(appDataPlugin, { serviceMethod });

    // register app action plugin
    fastify.register(appActionPlugin);
  });
};

export default plugin;
