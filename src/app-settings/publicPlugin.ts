import { FastifyPluginAsync } from 'fastify';

import graaspPublicPlugin from 'graasp-plugin-public';

import { AppSettingService } from './db-service';
import common, { getForOne } from './schemas';
import { TaskManager } from './task-manager';

const plugin: FastifyPluginAsync = async (fastify) => {
  const {
    items: { dbService: iS, taskManager: iTM },
    itemMemberships: { dbService: iMS, taskManager: iMTM },
    taskRunner: runner,
    public: {
      graaspActor,
      items: { taskManager: pITM },
    },
  } = fastify;

  if (!graaspPublicPlugin) {
    throw new Error('Public plugin is not correctly defined');
  }

  const aSS = new AppSettingService();
  fastify.decorate('appSettingService', aSS);

  const taskManager = new TaskManager(aSS, iS, iMS, iTM, iMTM);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    // get app data
    fastify.get<{ Params: { itemId: string } }>(
      '/:itemId/app-settings',
      { schema: getForOne },
      async ({ authTokenSubject: requestDetails, params: { itemId }, log }) => {
        const t1 = pITM.createGetPublicItemTask(graaspActor, { itemId });
        const t2 = taskManager.createGetTask(graaspActor, itemId, requestDetails);
        return runner.runSingleSequence([t1, t2], log);
      },
    );
  });
};

export default plugin;
