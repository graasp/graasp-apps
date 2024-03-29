import { promisify } from 'util';

import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { FastifyPluginAsync } from 'fastify';

import { AppIdentification, AuthTokenSubject } from '@graasp/sdk';
import graaspPublicPlugin from 'graasp-plugin-public';

import { AppDataService } from './app-data/db-service';
import publicAppDataPlugin from './app-data/publicPlugin';
import { GenerateApiAccessTokenSujectTask } from './app-data/tasks/generate-api-access-token-subject';
import common, { generateToken } from './schemas';
import { DEFAULT_JWT_EXPIRATION } from './util/constants';

type PublicAppsPluginOptions = {
  jwtExpiration?: number;
  jwtSecret: string;
};

const plugin: FastifyPluginAsync<PublicAppsPluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS },
    itemMemberships: { dbService: iMS },
    taskRunner: runner,
    db,
    public: {
      graaspActor,
      items: { taskManager: pITM },
    },
  } = fastify;
  const { jwtExpiration = DEFAULT_JWT_EXPIRATION, jwtSecret } = options;

  if (!graaspPublicPlugin) {
    throw new Error('Public plugin is not correctly defined');
  }

  fastify.addSchema(common);
  const aDS = new AppDataService();

  // register auth plugin
  // jwt plugin to manipulate jwt token
  await fastify.register(fastifyJwt, { secret: jwtSecret });

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // add CORS support that allows graasp's origin(s) + app publishers' origins.
    // TODO: not perfect because it's allowing apps' origins to call "/app-items/<id>/api-access-token",
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

    // register app data plugin
    fastify.register(publicAppDataPlugin);

    const promisifiedJwtSign = promisify<{ sub: AuthTokenSubject }, { expiresIn: string }, string>(
      fastify.jwt.sign,
    );

    // generate api access token for member + (app-)item.
    fastify.post<{ Params: { itemId: string }; Body: { origin: string } & AppIdentification }>(
      '/:itemId/api-access-token',
      { schema: generateToken },
      async ({ params: { itemId }, body, log }) => {
        const t1 = pITM.createGetPublicItemTask(graaspActor, { itemId });
        const t2 = new GenerateApiAccessTokenSujectTask(graaspActor, aDS, iS, iMS, {
          appDetails: body,
        });
        t2.getInput = () => ({ item: t1.result });
        const authTokenSubject = (await runner.runSingleSequence(
          [t1, t2],
          log,
        )) as AuthTokenSubject;
        const token = await promisifiedJwtSign(
          { sub: authTokenSubject },
          { expiresIn: `${jwtExpiration}m` },
        );
        return { token };
      },
    );
  });
};

export default plugin;
