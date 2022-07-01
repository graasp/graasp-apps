import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ItemMembershipService, ItemService, Member } from 'graasp';
import { ServiceMethod } from 'graasp-plugin-file';
import { ItemMembershipTaskManager, ItemTaskManager, TaskRunner } from 'graasp-test';

import { AppSettingService } from '../src/app-settings/db-service';
import { AppsPluginOptions } from '../src/types';
import { buildFileItemData } from '../src/util/utils';
import build from './app';
import {
  GRAASP_ACTOR,
  GRAASP_PUBLISHER_ID,
  ITEM_APP,
  MOCK_JWT_SECRET,
  MOCK_LOGGER,
  MOCK_MEMBERSHIP,
  MOCK_TOKEN,
  buildAppSetting,
  buildMockAuthTokenSubject,
} from './fixtures';
import {
  mockCreateCopyFileTask,
  mockCreateGetMemberItemMembershipTask,
  mockCreateGetTask,
  mockPromisify,
  mockRunSingleSequence,
} from './mock';

const defaultOptions: AppsPluginOptions = {
  jwtSecret: MOCK_JWT_SECRET,
  serviceMethod: ServiceMethod.LOCAL,
  thumbnailsPrefix: '/',
  GRAASP_PUBLISHER_ID,
};

const runner = new TaskRunner();
const itemService = {} as unknown as ItemService;
const itemMembershipsService = {} as unknown as ItemMembershipService;
const itemMembershipTaskManager = new ItemMembershipTaskManager();
const itemTaskManager = new ItemTaskManager();
jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(() => true);

const buildAppOptions = (args?: { options?: AppsPluginOptions; member?: Member }) => {
  const { options = defaultOptions, member = GRAASP_ACTOR } = args ?? {};
  return {
    runner,
    itemService,
    itemMembershipsService,
    itemMembershipTaskManager,
    itemTaskManager,
    options,
    member,
  };
};

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

  describe('Hooks', () => {
    describe('Copy Post Hook', () => {
      const taskName = itemTaskManager.getCopyTaskName();
      const actor = GRAASP_ACTOR;

      it('Stop if item is not an app item', async () => {
        jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(async (name, fn) => {
          if (name === taskName) {
            const original = { type: 'file', id: 'some-id' };
            const fileTaskMock = mockCreateCopyFileTask('newFilePath');
            await fn(original, actor, { log: MOCK_LOGGER }, { original });
            expect(fileTaskMock).toHaveBeenCalledTimes(0);
          }
        });
        await build(buildAppOptions());
      });
      it('Copy all app settings', async () => {
        jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(async (name, fn) => {
          if (name === taskName) {
            const original = ITEM_APP;
            const appSettings = [buildAppSetting(), buildAppSetting(), buildAppSetting()];
            const mockCreate = jest
              .spyOn(AppSettingService.prototype, 'create')
              .mockImplementation(async (data) => buildAppSetting(data));
            jest
              .spyOn(AppSettingService.prototype, 'getForItem')
              .mockImplementation(async () => appSettings);
            const fileTaskMock = mockCreateCopyFileTask('newFilePath');
            await fn(original, actor, { log: MOCK_LOGGER }, { original });
            expect(mockCreate).toHaveBeenCalledTimes(appSettings.length);
            expect(fileTaskMock).toHaveBeenCalledTimes(0);
          }
        });
        await build(buildAppOptions());
      });
      it('Copy all app settings and related files', async () => {
        jest.spyOn(runner, 'setTaskPostHookHandler').mockImplementation(async (name, fn) => {
          if (name === taskName) {
            const original = ITEM_APP;

            const appSettings = [
              buildAppSetting(),
              buildAppSetting(),
              buildAppSetting({
                name: 'file-setting',
                data: buildFileItemData({
                  name: 'myfile',
                  type: defaultOptions.serviceMethod,
                  filename: 'filename',
                  mimetype: 'mimetype',
                  size: 400,
                  filepath: 'filepath',
                }),
              }),
            ];
            const mockCreate = jest
              .spyOn(AppSettingService.prototype, 'create')
              .mockImplementation(async (data) => buildAppSetting(data));
            jest
              .spyOn(AppSettingService.prototype, 'getForItem')
              .mockImplementation(async () => appSettings);
            const fileTaskMock = mockCreateCopyFileTask('newFilePath');
            await fn(original, actor, { log: MOCK_LOGGER }, { original });
            expect(mockCreate).toHaveBeenCalledTimes(appSettings.length);
            expect(fileTaskMock).toHaveBeenCalledTimes(1);
          }
        });
        await build(buildAppOptions());
      });
    });
  });
});
