import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';
import build from './app';
import {
  GRAASP_ACTOR,
  buildMockAuthTokenSubject,
  MOCK_JWT_SECRET,
  MOCK_TOKEN,
  buildAppSetting,
  MOCK_MEMBERSHIP,
} from './fixtures';
import { ServiceMethod } from 'graasp-plugin-file';
import { TaskRunner, ItemTaskManager, ItemMembershipTaskManager } from 'graasp-test';
import { ItemService, ItemMembershipService } from 'graasp';
import {
  mockCreateGetMemberItemMembershipTask,
  mockCreateGetTask,
  mockPromisify,
  mockRunSingle,
  mockRunSingleSequence,
} from './mock';
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
const itemMembershipTaskManager = new ItemMembershipTaskManager();
jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => true);

const buildAppOptions = ({ options = defaultOptions, member = GRAASP_ACTOR } = {}) => ({
  runner,
  itemService,
  itemMembershipsService,
  itemMembershipTaskManager,
  itemTaskManager,
  options,
  member,
});

const item = { id: v4() };

describe('Apps Settings Tests', () => {
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
    describe('GET /:itemId/app-settings', () => {
      const appSettings = [buildAppSetting(), buildAppSetting()];
      beforeEach(() => {
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));
        mockCreateGetTask(item);
        mockCreateGetMemberItemMembershipTask(MOCK_MEMBERSHIP);
        mockRunSingleSequence(appSettings);
      });

      it('Post app setting successfully', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: `/${item.id}/app-settings`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        console.log('response: ', response);
        expect(response.statusCode).toEqual(StatusCodes.OK);
        expect(response.json()).toEqual(appSettings);
      });

      it('Post app setting without member and token throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: `/${item.id}/app-settings`,
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });
      it('Post app setting with invalid item id throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'GET',
          url: '/invalid-id/app-settings',
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });

    describe('POST /:itemId/app-settings', () => {
      const appSetting = buildAppSetting();
      beforeEach(() => {
        mockCreateGetMemberItemMembershipTask(MOCK_MEMBERSHIP);
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));
        mockCreateGetTask(item);
        mockRunSingleSequence(appSetting);
      });

      it('Post app setting successfully', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'POST',
          url: `/${item.id}/app-settings`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
          payload: appSetting,
        });
        expect(response.statusCode).toEqual(StatusCodes.OK);
        const newAppSetting = response.json();
        expect(newAppSetting.name).toEqual(appSetting.name);
        expect(newAppSetting.data).toEqual(appSetting.data);
      });
      it('Post app setting without member and token throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'POST',
          url: `/${item.id}/app-settings`,
          payload: appSetting,
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });
      it('Invalid item id throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'POST',
          url: '/invalid-id/app-settings',
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
          payload: appSetting,
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });

    describe('PATCH /:itemId/app-settings/:appSettingId', () => {
      const appSetting = buildAppSetting();
      const updatedSetting = { ...appSetting, data: { mySetting: 'value' } };
      beforeEach(() => {
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));
        mockCreateGetMemberItemMembershipTask(MOCK_MEMBERSHIP);
        mockCreateGetTask(item);
        mockRunSingleSequence(updatedSetting);
      });

      it('Patch app settings successfully', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/${item.id}/app-settings/${appSetting.id}`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
          payload: { data: updatedSetting.data },
        });
        expect(response.statusCode).toEqual(StatusCodes.OK);
        expect(response.json()).toMatchObject(updatedSetting);
      });

      it('Request without member and token throws', async () => {
        const app = await build(buildAppOptions({ member: null }));
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/${item.id}/app-settings/${appSetting.id}`,
          payload: { data: updatedSetting.data },
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });
      it('Invalid item id throws bad request', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/invalid-id/app-settings/${appSetting.id}`,
          payload: { data: updatedSetting.data },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
      it('Invalid app setting id throws bad request', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'PATCH',
          url: `/${item.id}/app-settings/invalid-id`,
          payload: { data: updatedSetting.data },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });

    describe('DELETE /:itemId/app-settings/:appSettingId', () => {
      const appSetting = buildAppSetting();
      beforeEach(() => {
        mockPromisify(buildMockAuthTokenSubject({ item: item.id }));
        mockCreateGetMemberItemMembershipTask(MOCK_MEMBERSHIP);
        mockCreateGetTask(item);
        mockRunSingleSequence(appSetting);
      });

      it('Delete app setting successfully', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'DELETE',
          url: `/${item.id}/app-settings/${appSetting.id}`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        expect(response.statusCode).toEqual(StatusCodes.OK);
        expect(response.json()).toMatchObject(appSetting);
      });

      it('Delete app setting without member and token throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'DELETE',
          url: `/${item.id}/app-settings/${appSetting.id}`,
        });
        expect(response.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
      });

      it('Delete app setting with invalid id throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'DELETE',
          url: `/invalid-id/app-settings/${appSetting.id}`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
      it('Delete app setting with invalid app setting id throws', async () => {
        const app = await build(buildAppOptions());
        expect(app).toBeTruthy();

        const response = await app.inject({
          method: 'DELETE',
          url: `/${item.id}/app-settings/invalid-id`,
          headers: {
            Authorization: `Bearer ${MOCK_TOKEN}`,
          },
        });
        expect(response.statusCode).toEqual(StatusCodes.BAD_REQUEST);
      });
    });
  });
});
