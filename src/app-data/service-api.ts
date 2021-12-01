// global
import { FastifyPluginAsync } from 'fastify';
import { IdParam } from 'graasp';
import GraaspFilePlugin, { ServiceMethod } from 'graasp-plugin-file';

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

interface PluginOptions {
  enableS3: boolean;
}

const plugin: FastifyPluginAsync<PluginOptions> = async (fastify, options) => {
  const {
    items: { dbService: iS },
    itemMemberships: { dbService: iMS },
    taskRunner: runner,
    appDataService: aDS
  } = fastify;

  const { enableS3 } = options;

  const taskManager = new TaskManager(aDS, iS, iMS);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    // TODO: allow CORS but only the origins in the table from approved publishers - get all
    // origins from the publishers table an build a rule with that.

    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    // Files
    const FILE_ITEM_TYPES = {
      S3: 's3File',
      LOCAL: 'file',
    };
    const SERVICE_ITEM_TYPE = enableS3 ? FILE_ITEM_TYPES.S3 : FILE_ITEM_TYPES.LOCAL;

    const randomHexOf4 = () => ((Math.random() * (1 << 16)) | 0).toString(16).padStart(4, '0');
    const buildFilePath = () => {
      const filepath = `${randomHexOf4()}/${randomHexOf4()}/${randomHexOf4()}-${Date.now()}`;
      return `apps/${filepath}`;
    };

    fastify.register(GraaspFilePlugin, {
      serviceMethod: enableS3 ? ServiceMethod.S3 : ServiceMethod.LOCAL,
      serviceOptions: {
        s3: fastify.s3FileItemPluginOptions,
        local: fastify.fileItemPluginOptions,
      },
      buildFilePath: buildFilePath,

      uploadPreHookTasks: async ({ parentId: itemId }, { token }) => {
        const { member: id } = token;
        return [ taskManager.createGetTask({ id }, itemId, { visibility: 'member'}, token) ];
      },
      uploadPostHookTasks: async (
        { filename, itemId, filepath, size, mimetype },
        { token }
      ) => {
        const { member: id } = token;

        const name = filename.substring(0, 100);
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

        const tasks = taskManager.createCreateTask({ id },  {
          data: {
            ...data
          },
          type: 'file',
          visibility: 'member',
        },
        itemId,
        token);

        return [ tasks ];
      },

      downloadPreHookTasks: async ({ itemId }, { token }) => {
        return [ taskManager.createGetFileTask({ id: token.member }, { appDataId: itemId, enableS3 }, token) ];
      },
    });

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
