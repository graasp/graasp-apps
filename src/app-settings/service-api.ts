import { FastifyPluginAsync } from 'fastify';
import { IdParam } from 'graasp';
import GraaspFilePlugin, { ServiceMethod } from 'graasp-plugin-file';
import {
  randomHexOf4,
  ORIGINAL_FILENAME_TRUNCATE_LIMIT,
  FILE_ITEM_TYPES,
} from 'graasp-plugin-file-item';
import { AppSetting, InputAppSetting } from './interfaces/app-setting';
import common, { create, updateOne, deleteOne, getForOne } from './schemas';
import { TaskManager } from './task-manager';
import path from 'path';
import { AppSettingService } from './db-service';

interface PluginOptions {
  serviceMethod: ServiceMethod;
}

const PATH_PREFIX = 'apps/';

const plugin: FastifyPluginAsync<PluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS, taskManager: iTM },
    itemMemberships: { dbService: iMS, taskManager: iMTM },
    taskRunner: runner,
  } = fastify;

  const aSS = new AppSettingService();

  const { serviceMethod } = options;

  const taskManager = new TaskManager(aSS, iS, iMS, iTM, iMTM);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    const SERVICE_ITEM_TYPE =
      serviceMethod === ServiceMethod.S3 ? FILE_ITEM_TYPES.S3 : FILE_ITEM_TYPES.LOCAL;

    const buildFilePath = () => {
      const filepath = `${randomHexOf4()}/${randomHexOf4()}/${randomHexOf4()}-${Date.now()}`;
      return path.join(PATH_PREFIX, filepath);
    };

    fastify.register(GraaspFilePlugin, {
      prefix: '/app-settings',
      serviceMethod: serviceMethod,
      serviceOptions: {
        s3: fastify.s3FileItemPluginOptions,
        local: fastify.fileItemPluginOptions,
      },
      buildFilePath: buildFilePath,

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
        const data = {
          name,
          type: SERVICE_ITEM_TYPE,
          extra: {
            [SERVICE_ITEM_TYPE]: {
              name: filename,
              path: filepath,
              size,
              mimetype,
            },
          },
        };

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
