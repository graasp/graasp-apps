import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';
import build from './app';
import {
  GRAASP_ACTOR,
  MOCK_APP_ORIGIN,
  buildMockAuthTokenSubject,
  MOCK_CONTEXT,
  MOCK_JWT_SECRET,
  MOCK_SETTINGS,
  MOCK_TOKEN,
  MOCK_APPS,
} from './fixtures';
import { ServiceMethod } from 'graasp-plugin-file';
import { TaskRunner, ItemTaskManager } from 'graasp-test';
import { ItemService, ItemMembershipService } from 'graasp';
import {
  mockCreateGetTaskSequence,
  mockCreateUpdateTaskSequence,
  mockPromisify,
  mockRunSingle,
  mockRunSingleSequence,
} from './mock';
import { AppService } from '../src/db-service';
import { AppsPluginOptions } from '../src/types';

const defaultOptions: AppsPluginOptions = {
  jwtSecret: MOCK_JWT_SECRET,
  serviceMethod: ServiceMethod.LOCAL,
  thumbnailsPrefix: '/',
};

const runner = new TaskRunner();
const itemService = {} as unknown as ItemService;
const itemMembershipsService = {} as unknown as ItemMembershipService;
const itemTaskManager = new ItemTaskManager();
jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => true);

const buildAppOptions = ({ options = defaultOptions, member = GRAASP_ACTOR } = {}) => ({
  runner,
  itemService,
  itemMembershipsService,
  itemTaskManager,
  options,
  member,
});

describe('Apps Plugin Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Options', () => {
    it('Valid options should resolve', async () => {
      const app = await build(buildAppOptions());
      expect(app).toBeTruthy();
    });
    it('Invalid rootpath should throw', async () => {
      expect(
        async () =>
          await build(
            buildAppOptions({
              options: {
                ...defaultOptions,
                jwtSecret: null,
              },
            }),
          ),
      ).rejects.toThrow(Error);
      expect(
        async () =>
          await build(
            buildAppOptions({
              options: {
                ...defaultOptions,
                serviceMethod: null,
              },
            }),
          ),
      ).rejects.toThrow(Error);
      expect(
        async () =>
          await build(
            buildAppOptions({
              options: {
                ...defaultOptions,
                thumbnailsPrefix: null,
              },
            }),
          ),
      ).rejects.toThrow(Error);
    });
  });

  describe('Endpoints', () => {
    describe('GET /list', () => {
      it('Get apps list', async () => {
        const app = await build(buildAppOptions());

        const apps = MOCK_APPS;
        jest.spyOn(AppService.prototype, 'getAppsList').mockResolvedValue(apps);
        mockRunSingle(apps);

        const response = await app.inject({
          method: 'GET',
          url: '/list',
        });
        const data = response.json();
        expect(data[0].name).toEqual(apps[0].name);
        expect(data[0].url).toEqual(apps[0].url);
        expect(data[0].id).toBeFalsy();
      });
      it('Unauthorized member cannot get apps list', async () => {
        const app = await build(buildAppOptions({ member: null }));

        const response = await app.inject({
          method: 'GET',
          url: '/list',
        });
        const data = response.json();
        expect(data.statusCode).toBeTruthy();
      });
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

    describe('PATCH /:itemId/settings', () => {
      it('Patch item settings successfully', async () => {
        mockCreateUpdateTaskSequence();
        const item = { id: v4() };
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));

        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/${item.id}/settings`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
          payload: MOCK_SETTINGS,
        });
        expect(response.statusCode).toEqual(StatusCodes.NO_CONTENT);
      });

      it('Request without member and token throws', async () => {
        mockCreateUpdateTaskSequence();
        const item = { id: v4() };
        // mock promisifiedJwtVerify to pass
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));

        const app = await build(buildAppOptions({ member: null }));
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/${item.id}/settings`,
          payload: MOCK_SETTINGS,
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });
      it('Invalid item id throws bad request', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: '/invalid-id/settings',
          payload: MOCK_SETTINGS,
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });
  });
});
