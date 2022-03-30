// global
import { FastifyPluginAsync } from 'fastify';
import { IdParam } from 'graasp';
import GraaspFilePlugin, { ServiceMethod, FileTaskManager } from 'graasp-plugin-file';
import { ORIGINAL_FILENAME_TRUNCATE_LIMIT, FILE_ITEM_TYPES } from 'graasp-plugin-file-item';

// local
import { AppData, InputAppData } from './interfaces/app-data';
import common, { create, updateOne, deleteOne, getForOne, getForMany } from './schemas';
import { ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { TaskManager } from './task-manager';
import { buildFilePath, buildFileItemData } from '../util/utils';
import { APP_DATA_TYPE_FILE } from '../util/constants';

interface PluginOptions {
  serviceMethod: ServiceMethod;
}

const plugin: FastifyPluginAsync<PluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS, taskManager: iTM },
    itemMemberships: { dbService: iMS, taskManager: iMTM },
    taskRunner: runner,
    appDataService: aDS,
  } = fastify;

  const { serviceMethod } = options;

  const SERVICE_ITEM_TYPE =
    serviceMethod === ServiceMethod.S3 ? FILE_ITEM_TYPES.S3 : FILE_ITEM_TYPES.LOCAL;

  const fileOptions = {
    s3: fastify.s3FileItemPluginOptions,
    local: fastify.fileItemPluginOptions,
  };
  const fileTaskManager = new FileTaskManager(fileOptions, serviceMethod);
  const taskManager = new TaskManager(aDS, iS, iMS, iTM, iMTM, SERVICE_ITEM_TYPE, fileTaskManager);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    fastify.register(GraaspFilePlugin, {
      serviceMethod: serviceMethod,
      serviceOptions: fileOptions,
      buildFilePath,

      uploadPreHookTasks: async ({ parentId: itemId }, { token }) => {
        const { member: id } = token;
        return [taskManager.createGetTask({ id }, itemId, { visibility: 'member' }, token)];
      },
      uploadPostHookTasks: async (
        { filename, itemId, filepath, size, mimetype },
        { token },
        fileBody = {},
      ) => {
        const { member: id } = token;

        const name = filename.substring(0, ORIGINAL_FILENAME_TRUNCATE_LIMIT);
        const data = buildFileItemData({
          name,
          type: SERVICE_ITEM_TYPE,
          filename,
          filepath,
          size,
          mimetype,
        });

        const tasks = taskManager.createCreateTaskSequence(
          { id },
          {
            data: {
              ...data,
            },
            type: APP_DATA_TYPE_FILE,
            visibility: 'member',
            ...fileBody,
          },
          itemId,
          token,
        );

        return tasks;
      },

      downloadPreHookTasks: async ({ itemId }, { token }) => {
        return [
          taskManager.createGetFileTask(
            { id: token.member },
            { appDataId: itemId, serviceMethod },
            token,
          ),
        ];
      },
    });

    // create app data
    fastify.post<{ Params: { itemId: string }; Body: Partial<InputAppData> }>(
      '/:itemId/app-data',
      { schema: create },
      async ({ authTokenSubject: requestDetails, params: { itemId }, body, log }) => {
        const { member: id } = requestDetails;
        const tasks = taskManager.createCreateTaskSequence({ id }, body, itemId, requestDetails);
        return runner.runSingleSequence(tasks, log);
      },
    );

    // update app data
    fastify.patch<{ Params: { itemId: string } & IdParam; Body: Partial<AppData> }>(
      '/:itemId/app-data/:id',
      { schema: updateOne },
      async ({
        authTokenSubject: requestDetails,
        params: { itemId, id: appDataId },
        body,
        log,
      }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createUpdateTask({ id }, appDataId, body, itemId, requestDetails);
        return runner.runSingle(task, log);
      },
    );

    // delete app data
    fastify.delete<{ Params: { itemId: string } & IdParam }>(
      '/:itemId/app-data/:id',
      { schema: deleteOne },
      async ({ authTokenSubject: requestDetails, params: { itemId, id: appDataId }, log }) => {
        const { member: id } = requestDetails;
        const tasks = taskManager.createDeleteTaskSequence(
          { id },
          appDataId,
          itemId,
          requestDetails,
        );
        return runner.runSingleSequence(tasks, log);
      },
    );

    // get app data
    fastify.get<{ Params: { itemId: string }; Querystring: SingleItemGetFilter }>(
      '/:itemId/app-data',
      { schema: getForOne },
      async ({ authTokenSubject: requestDetails, params: { itemId }, query: filter, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetTask({ id }, itemId, filter, requestDetails);
        return runner.runSingle(task, log);
      },
    );

    // get app data from multiple items
    fastify.get<{ Querystring: ManyItemsGetFilter }>(
      '/app-data',
      { schema: getForMany },
      async ({ authTokenSubject: requestDetails, query: filter, log }) => {
        const { member: id } = requestDetails;
        const tasks = taskManager.createGetItemsAppDataTaskSequence({ id }, filter, requestDetails);
        return runner.runSingleSequence(tasks, log);
      },
    );
  });
};

export default plugin;
