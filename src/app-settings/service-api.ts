import { FastifyPluginAsync } from 'fastify';
import { IdParam, Item } from 'graasp';
import GraaspFilePlugin, {
  ServiceMethod,
  FileTaskManager,
  FileProperties,
} from 'graasp-plugin-file';
import { ORIGINAL_FILENAME_TRUNCATE_LIMIT, FILE_ITEM_TYPES } from 'graasp-plugin-file-item';
import { AppSetting, InputAppSetting } from './interfaces/app-setting';
import common, { create, updateOne, deleteOne, getForOne } from './schemas';
import { TaskManager } from './task-manager';
import { AppSettingService } from './db-service';
import { buildFilePath, buildFileItemData } from '../util/utils';
import { ITEM_TYPE_APP } from '../util/constants';

interface PluginOptions {
  serviceMethod: ServiceMethod;
}

const plugin: FastifyPluginAsync<PluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS, taskManager: iTM },
    itemMemberships: { dbService: iMS, taskManager: iMTM },
    taskRunner: runner,
    fileItemPluginOptions,
    s3FileItemPluginOptions,
  } = fastify;

  const aSS = new AppSettingService();

  const { serviceMethod } = options;
  const fTM = new FileTaskManager(
    { s3: s3FileItemPluginOptions, local: fileItemPluginOptions },
    serviceMethod,
  );

  const taskManager = new TaskManager(aSS, iS, iMS, iTM, iMTM);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    const SERVICE_ITEM_TYPE =
      serviceMethod === ServiceMethod.S3 ? FILE_ITEM_TYPES.S3 : FILE_ITEM_TYPES.LOCAL;

    fastify.register(GraaspFilePlugin, {
      prefix: '/app-settings',
      serviceMethod: serviceMethod,
      serviceOptions: {
        s3: fastify.s3FileItemPluginOptions,
        local: fastify.fileItemPluginOptions,
      },
      buildFilePath,

      uploadPreHookTasks: async ({ parentId: itemId }, { token }) => {
        const { member: id } = token;
        return taskManager.createGetTaskSequence({ id }, itemId, token);
      },
      uploadPostHookTasks: async (
        { filename, itemId, filepath, size, mimetype },
        { token },
        requestBody,
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
            name: requestBody.name,
            data: {
              ...data,
            },
          },
          itemId,
          token,
        );

        return tasks;
      },

      downloadPreHookTasks: async ({ itemId: appSettingId }, { token }) => {
        return [
          taskManager.createGetFileTask(
            { id: token.member },
            { appSettingId, serviceMethod },
            token,
          ),
        ];
      },
    });

    // copy app settings and related files on item copy
    const copyTaskName = iTM.getCopyTaskName();
    runner.setTaskPostHookHandler<Item>(
      copyTaskName,
      async ({ id: newId, type }, actor, { log, handler }, { original }) => {
        try {
          if (!newId || type !== ITEM_TYPE_APP) return;

          const appSettings = await aSS.getForItem(original.id, handler);
          for (const appS of appSettings) {
            const copyData = {
              name: appS.name,
              data: appS.data,
              itemId: newId,
              creator: actor.id,
            };
            console.log(copyData);
            const newSetting = await aSS.create(copyData, handler);

            // copy file only if content is a file
            const isFileSetting = appS.data.type === SERVICE_ITEM_TYPE;
            if (isFileSetting) {
              // create file data object
              const newFilePath = buildFilePath();
              const newFileData = buildFileItemData({
                filepath: newFilePath,
                name: appS.data.name,
                type: appS.data.type,
                filename: appS.data.extra[SERVICE_ITEM_TYPE].name,
                size: appS.data.extra[SERVICE_ITEM_TYPE].size,
                mimetype: appS.data.extra[SERVICE_ITEM_TYPE].mimetype,
              });

              // set to new app setting
              copyData.data = newFileData;

              // run copy task
              const originalFileExtra = appS.data.extra[SERVICE_ITEM_TYPE] as FileProperties;
              const fileCopyData = {
                newId: newSetting.id,
                newFilePath,
                originalPath: originalFileExtra.path,
                mimetype: originalFileExtra.mimetype,
              };
              const fileCopyTask = fTM.createCopyFileTask(actor, fileCopyData);
              await runner.runSingle(fileCopyTask);

              // update new setting with file data
              await aSS.update(newSetting.id, { data: newFileData }, handler);
            }
          }
        } catch (err) {
          log.error(err);
        }
      },
    );

    // create app setting
    fastify.post<{ Params: { itemId: string }; Body: Partial<InputAppSetting> }>(
      '/:itemId/app-settings',
      { schema: create },
      async ({ authTokenSubject: requestDetails, params: { itemId }, body, log }) => {
        const { member: id } = requestDetails;
        const tasks = taskManager.createCreateTaskSequence({ id }, body, itemId, requestDetails);
        return runner.runSingleSequence(tasks, log);
      },
    );

    // update app setting
    fastify.patch<{ Params: { itemId: string } & IdParam; Body: Partial<AppSetting> }>(
      '/:itemId/app-settings/:id',
      { schema: updateOne },
      async ({
        authTokenSubject: requestDetails,
        params: { itemId, id: appSettingId },
        body,
        log,
      }) => {
        const { member: id } = requestDetails;
        const tasks = taskManager.createUpdateTaskSequence(
          { id },
          appSettingId,
          body,
          itemId,
          requestDetails,
        );
        return runner.runSingleSequence(tasks, log);
      },
    );

    // delete app setting
    fastify.delete<{ Params: { itemId: string } & IdParam }>(
      '/:itemId/app-settings/:id',
      { schema: deleteOne },
      async ({ authTokenSubject: requestDetails, params: { itemId, id: appSettingId }, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createDeleteTaskSequence(
          { id },
          appSettingId,
          itemId,
          requestDetails,
        );
        return runner.runSingleSequence(task, log);
      },
    );

    // get app settings
    fastify.get<{ Params: { itemId: string } }>(
      '/:itemId/app-settings',
      { schema: getForOne },
      async ({ authTokenSubject: requestDetails, params: { itemId }, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetTaskSequence({ id }, itemId, requestDetails);
        return runner.runSingleSequence(task, log);
      },
    );
  });
};

export default plugin;
