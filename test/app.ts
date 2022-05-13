import fastify from 'fastify';

import { Actor, ItemMembershipService, ItemService, ItemTaskManager } from 'graasp';
import { ItemMembershipTaskManager, TaskRunner } from 'graasp-test';

import plugin from '../src/plugin';
import { AppsPluginOptions } from '../src/types';
import { GRAASP_ACTOR, MOCK_LOCAL_OPTIONS, MOCK_S3_OPTIONS } from './fixtures';

const schemas = {
  $id: 'http://graasp.org/',
  definitions: {
    uuid: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    idParam: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { $ref: '#/definitions/uuid' },
      },
      additionalProperties: false,
    },
  },
};

const build = async ({
  runner,
  itemService: iS,
  itemTaskManager: iTM,
  itemMembershipTaskManager: iMTM,
  itemMembershipsService: iMS,
  options,
  member = GRAASP_ACTOR,
}: {
  runner: TaskRunner;
  itemService: ItemService;
  itemTaskManager: ItemTaskManager;
  itemMembershipsService: ItemMembershipService;
  itemMembershipTaskManager: ItemMembershipTaskManager;
  options?: AppsPluginOptions;
  member?: Actor;
}) => {
  const app = fastify();
  app.addSchema(schemas);

  app.decorateRequest('member', member);

  app.decorate('items', {
    dbService: iS,
    taskManager: iTM,
    extendCreateSchema: jest.fn(),
    extendExtrasUpdateSchema: jest.fn(),
  });
  app.decorate('itemMemberships', { dbService: iMS, taskManager: iMTM });
  app.decorate('s3FileItemPluginOptions', MOCK_S3_OPTIONS);
  app.decorate('fileItemPluginOptions', MOCK_LOCAL_OPTIONS);

  app.decorate('taskRunner', runner);

  // this mock function check if member is authenticated
  app.decorate(
    'verifyAuthentication',
    jest.fn().mockImplementation(async (request) => {
      if (!request?.member) {
        throw new Error('member is not authenticated');
      }
    }),
  );

  await app.register(plugin, options);

  return app;
};
export default build;
