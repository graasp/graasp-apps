// global
import { FastifyPluginAsync } from 'fastify';
import fastifyJwt from 'fastify-jwt';
import graaspPublicPlugin from 'graasp-plugin-public';
import fastifyCors from 'fastify-cors';

// local
import common, { generateToken } from './schemas';
import { APP_ITEMS_PREFIX } from './util/constants';
import publicAppDataPlugin from './app-data/publicPlugin';
import { AuthTokenSubject } from './interfaces/request';
import { promisify } from 'util';
import { AppIdentification } from './interfaces/app-details';
import { GenerateApiAccessTokenSujectTask } from './app-data/tasks/generate-api-access-token-subject';
import { DEFAULT_JWT_EXPIRATION } from './util/constants';
import { AppDataService } from './app-data/db-service';

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

  fastify.register(publicAppDataPlugin);

  // endpoints accessible to third parties with Bearer token
  fastify.register(
    async function (fastify) {
      // TODO: allow CORS but only the origins in the table from approved publishers - get all
      // origins from the publishers table an build a rule with that.

      const promisifiedJwtSign = promisify<
        { sub: AuthTokenSubject },
        { expiresIn: string },
        string
      >(fastify.jwt.sign);

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
    },
    { prefix: APP_ITEMS_PREFIX },
  );
};

export default plugin;
