import { FastifyPluginAsync } from 'fastify';

import { FileItemType, FileProperties, IdParam, Item, ItemType } from '@graasp/sdk';
import GraaspFilePlugin, { FileTaskManager } from 'graasp-plugin-file';
import { ORIGINAL_FILENAME_TRUNCATE_LIMIT } from 'graasp-plugin-file-item';

import { buildFileItemData, buildFilePath } from '../util/utils';
import { AppSettingService } from './db-service';
import { AppSetting, InputAppSetting } from './interfaces/app-setting';
import common, { create, deleteOne, getForOne, updateOne } from './schemas';
import { TaskManager } from './task-manager';

interface PluginOptions {
  fileItemType: FileItemType;
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

  const { fileItemType } = options;
  const fTM = new FileTaskManager(
    { s3: s3FileItemPluginOptions, local: fileItemPluginOptions },
    fileItemType,
  );

  const taskManager = new TaskManager(aSS, iS, iMS, iTM, iMTM, fileItemType, fTM);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    fastify.register(GraaspFilePlugin, {
      prefix: '/app-settings',
      shouldRedirectOnDownload: false,
      uploadMaxFileNb: 1,
      fileItemType: fileItemType,
      fileConfigurations: {
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
          type: fileItemType,
          filename,
          filepath,
          size,
          mimetype,
        });

        const tasks = taskManager.createCreateTaskSequence(
          { id },
          {
            name: requestBody?.name ?? 'file',
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
            { appSettingId, fileItemType },
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
          if (!newId || type !== ItemType.APP) return;

          const appSettings = await aSS.getForItem(original.id, handler);
          for (const appS of appSettings) {
            const copyData = {
              name: appS.name,
              data: appS.data,
              itemId: newId,
              creator: actor.id,
            };
            const newSetting = await aSS.create(copyData, handler);

            // copy file only if content is a file
            const isFileSetting = appS.data.type === fileItemType;
            if (isFileSetting) {
              // create file data object
              const newFilePath = buildFilePath();
              const newFileData = buildFileItemData({
                filepath: newFilePath,
                name: appS.data.name,
                type: appS.data.type,
                filename: appS.data.extra[fileItemType].name,
                size: appS.data.extra[fileItemType].size,
                mimetype: appS.data.extra[fileItemType].mimetype,
              });

              // set to new app setting
              copyData.data = newFileData;

              // run copy task
              const originalFileExtra = appS.data.extra[fileItemType] as FileProperties;
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
