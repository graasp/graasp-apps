// global
import { FastifyPluginAsync } from 'fastify';
import graaspPublicPlugin from 'graasp-plugin-public';

// local
import common, { getForOne, getForMany } from './schemas';
import { ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { TaskManager } from './task-manager';
import { APP_ITEMS_PREFIX } from '../util/constants';

const plugin: FastifyPluginAsync = async (fastify) => {
  const {
    items: { dbService: iS, taskManager: iTM },
    itemMemberships: { dbService: iMS, taskManager: iMTM },
    taskRunner: runner,
    appDataService: aDS,
    public: {
      graaspActor,
      items: { taskManager: pITM },
    },
  } = fastify;

  if (!graaspPublicPlugin) {
    throw new Error('Public plugin is not correctly defined');
  }

  const taskManager = new TaskManager(aDS, iS, iMS, iTM, iMTM);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(
    async function (fastify) {
      // TODO: allow CORS but only the origins in the table from approved publishers - get all
      // origins from the publishers table an build a rule with that.

      // get app data
      fastify.get<{ Params: { itemId: string }; Querystring: SingleItemGetFilter }>(
        '/:itemId/app-data',
        { schema: getForOne },
        async ({ authTokenSubject: requestDetails, params: { itemId }, query: filter, log }) => {
          const t1 = pITM.createGetPublicItemTask(graaspActor, { itemId });
          const t2 = taskManager.createGetTask(graaspActor, itemId, filter, requestDetails);
          return runner.runSingleSequence([t1, t2], log);
        },
      );

      // get app data from multiple items
      fastify.get<{ Querystring: ManyItemsGetFilter }>(
        '/app-data',
        { schema: getForMany },
        async ({ authTokenSubject: requestDetails, query: filter, log }) => {
          const { itemId: itemIds } = filter;
          const t1 = itemIds.map((itemId) => pITM.createGetPublicItemTask(graaspActor, { itemId }));
          const { item: tokenItemId } = requestDetails;
          const t2 = pITM.createGetPublicItemTask(graaspActor, { itemId: tokenItemId });
          const t3 = taskManager.createGetItemsAppDataTask(graaspActor, filter, requestDetails);
          t3.getInput = () => ({
            parentItem: t2.result,
          });
          return runner.runSingleSequence([...t1, t2, t3], log);
        },
      );
    },
    { prefix: APP_ITEMS_PREFIX },
  );
};

export default plugin;
