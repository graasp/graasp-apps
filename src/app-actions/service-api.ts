// global
import { FastifyPluginAsync } from 'fastify';

// local
import { InputAppAction } from './interfaces/app-action';
import common, {
  create,
  getForOne,
  getForMany
} from './schemas';
import { ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { TaskManager } from './task-manager';
import {AppActionService} from './db-service';

declare module 'fastify' {
  interface FastifyInstance {
    appActionService: AppActionService
  }
}

const plugin: FastifyPluginAsync = async (fastify) => {
  const {
    items: { dbService: iS },
    itemMemberships: { dbService: iMS },
    taskRunner: runner
  } = fastify;

  const aAS = new AppActionService();

  const taskManager = new TaskManager(aAS, iS, iMS);

  fastify.addSchema(common);

  // endpoints accessible to third parties with Bearer token
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', fastify.verifyBearerAuth);

    // create app action
    fastify.post<{ Params: { itemId: string }; Body: Partial<InputAppAction> }>(
      '/:itemId/app-action', { schema: create },
      async ({ authTokenSubject: requestDetails, params: { itemId }, body, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createCreateTask({ id }, body, itemId, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // get app action
    fastify.get<{ Params: { itemId: string }, Querystring: SingleItemGetFilter }>(
      '/:itemId/app-action', { schema: getForOne },
      async ({ authTokenSubject: requestDetails, params: { itemId }, query: filter, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetTask({ id }, itemId, filter, requestDetails);
        return runner.runSingle(task, log);
      }
    );

    // get app action from multiple items
    fastify.get<{ Querystring: ManyItemsGetFilter }>(
      '/app-action', { schema: getForMany },
      async ({ authTokenSubject: requestDetails, query: filter, log }) => {
        const { member: id } = requestDetails;
        const task = taskManager.createGetItemsAppActionTask({ id }, filter, requestDetails);
        return runner.runSingle(task, log);
      }
    );
  });
};

export default plugin;
