// global
import { FastifyPluginAsync } from 'fastify';
import { IdParam } from 'graasp';
import FileItemPlugin from 'graasp-plugin-file-item';

// local
import { AppData, InputAppData } from './interfaces/app-data';
import common, {
  create,
  updateOne,
  deleteOne,
  getForOne,
  getForMany
} from './schemas';
import { ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { TaskManager } from './task-manager';

interface AppsDataPluginOptions {
  enableS3FileItemPlugin?: boolean;
}

const plugin: FastifyPluginAsync<AppsDataPluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS },
    itemMemberships: { dbService: iMS },
    taskRunner: runner,
    appDataService: aDS
  } = fastify;

  const taskManager = new TaskManager(aDS, iS, iMS);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    if(!options.enableS3FileItemPlugin){

      await fastify.register(FileItemPlugin, {
        storageRootPath: '/apps',
        onFileUploaded: async (parent, data, { token }) => [taskManager.createCreateTask({ id: token.member }, {
          data: {
            ...data
          },
          type: 'file',
          visibility: 'member',
          },
          parent,
          token
        )],
        downloadValidation: async (id, { token }) => [
          taskManager.createGetTask({ id: token.member }, id, { memberId: token.member }, token)
        ],
      });
    }

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
};

export default plugin;
