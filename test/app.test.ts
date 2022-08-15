import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ItemMembershipService, ItemService, ItemType, Member } from '@graasp/sdk';
import { ItemMembershipTaskManager, ItemTaskManager, TaskRunner } from 'graasp-test';

import { AppService } from '../src/db-service';
import { AppsPluginOptions } from '../src/types';
import build from './app';
import {
  GRAASP_ACTOR,
  GRAASP_PUBLISHER_ID,
  MOCK_APPS,
  MOCK_APP_ORIGIN,
  MOCK_CONTEXT,
  MOCK_JWT_SECRET,
  MOCK_TOKEN,
  buildMockAuthTokenSubject,
} from './fixtures';
import {
  mockCreateGetTaskSequence,
  mockPromisify,
  mockRunSingle,
  mockRunSingleSequence,
} from './mock';

const defaultOptions: AppsPluginOptions = {
  jwtSecret: MOCK_JWT_SECRET,
  fileItemType: ItemType.LOCAL_FILE,
  thumbnailsPrefix: '/',
  publisherId: GRAASP_PUBLISHER_ID,
};

const runner = new TaskRunner();
const itemService = {} as unknown as ItemService;
const itemMembershipsService = {} as unknown as ItemMembershipService;
const itemMembershipTaskManager = new ItemMembershipTaskManager();
const itemTaskManager = new ItemTaskManager();
jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => true);

const buildAppOptions = (args: { options?: AppsPluginOptions; member?: Member | null } = {}) => {
  const { options = defaultOptions, member = GRAASP_ACTOR } = args;
  return {
    runner,
    itemService,
    itemMembershipsService,
    itemMembershipTaskManager,
    itemTaskManager,
    options,
    member: member === null ? undefined : member,
  };
};

describe('Apps Plugin Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Options', () => {
    it('Valid options should resolve', async () => {
      const app = await build(buildAppOptions());
      expect(app).toBeTruthy();
    });
  });

  describe('Endpoints', () => {
    describe('GET /list', () => {
      it('Get apps list', async () => {
        const app = await build(buildAppOptions());

        const apps = MOCK_APPS;
        jest.spyOn(AppService.prototype, 'getAppsListFor').mockResolvedValue(apps);
        mockRunSingle(apps);

        const response = await app.inject({
          method: 'GET',
          url: '/list',
        });
        const data = response.json();
        expect(data[0].name).toEqual(apps[0].name);
        expect(data[0].url).toEqual(apps[0].url);
        expect(data[0].id).toEqual(apps[0].id);
        expect(data[0].key).toBeFalsy();
      });
      // TODO: list should be public
      // it('Unauthorized member cannot get apps list', async () => {
      //   const app = await build(buildAppOptions({ member: undefined }));

      //   const response = await app.inject({
      //     method: 'GET',
      //     url: '/list',
      //   });
      //   const data = response.json();
      //   expect(data.statusCode).toBeTruthy();
      // });
    });
    describe('POST /:itemId/api-access-token', () => {
      it('Request api access', async () => {
        const item = { id: v4() };
        mockCreateGetTaskSequence(item);
        mockRunSingleSequence(item);

        const app = await build(buildAppOptions());

        const response = await app.inject({
          method: 'POST',
          url: `/${item.id}/api-access-token`,
          payload: { origin: MOCK_APP_ORIGIN, app: v4() },
        });
        expect(response.json().token).toBeTruthy();
      });
      it('Incorrect params throw bad request', async () => {
        const item = { id: v4() };
        mockCreateGetTaskSequence(item);
        mockRunSingleSequence(item);

        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'POST',
          url: `/${item.id}/api-access-token`,
          payload: { origin: MOCK_APP_ORIGIN },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);

        const response1 = await app.inject({
          method: 'POST',
          url: `/${item.id}/api-access-token`,
          payload: { app: v4() },
        });
        expect(response1.statusCode).toEqual(StatusCodes.BAD_REQUEST);

        const response2 = await app.inject({
          method: 'POST',
          url: '/unknown/api-access-token',
          payload: { app: v4() },
        });
        expect(response2.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
      it('Unauthenticated member throws error', async () => {
        const item = { id: v4() };
        mockCreateGetTaskSequence(item);
        mockRunSingleSequence(item);

        const app = await build(buildAppOptions({ member: null }));
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'POST',
          url: `/${item.id}/api-access-token`,
          payload: { origin: MOCK_APP_ORIGIN, app: v4() },
        });
        // the call should fail: suppose verifyAuthentication works correctly and throws
        expect(response.json().statusCode).toBeTruthy();
      });
    });

    describe('GET /:itemId/context', () => {
      it('Get app context successfully', async () => {
        // mock promisifiedJwtVerify to pass
        mockPromisify(buildMockAuthTokenSubject());
        const context = MOCK_CONTEXT;
        mockRunSingle(context);

        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: `/${v4()}/context`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        expect(response.json()).toEqual(context);
      });

      it('Request without token and without member throws', async () => {
        const item = { id: v4() };
        const context = MOCK_CONTEXT;
        mockRunSingle(context);
        // mock promisifiedJwtVerify to throw
        mockPromisify();

        const app = await build(buildAppOptions({ member: null }));
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: `/${item.id}/context`,
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });
      it('Invalid item id throws bad request', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: '/invalid-id/context',
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });
  });
});
