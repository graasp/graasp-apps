import { DatabaseTransactionHandler, Item, ItemMembershipService, ItemService } from 'graasp';

import { GRAASP_ACTOR, buildAppData } from '../../../test/fixtures';
import { AuthTokenSubject } from '../../interfaces/request';
import { PERMISSION_LEVELS } from '../../util/constants';
import { CannotUpdateAppDataFile } from '../../util/graasp-apps-error';
import { buildFileItemData } from '../../util/utils';
import { AppDataService } from '../db-service';
import { UpdateAppDataTask } from './update-app-data-task';

const appDataService = {} as unknown as AppDataService;
const itemService = {} as unknown as ItemService;
const itemMembershipService = {
  getPermissionLevel: jest.fn(),
} as unknown as ItemMembershipService;
const fileServiceType = 'file';
const handler = {} as unknown as DatabaseTransactionHandler;

const data = { data: { some: 'data' } };
const item = { id: 'item-id' } as unknown as Item;
const requestDetails: AuthTokenSubject = {
  member: 'member',
  item: item.id,
  origin: 'origin',
  app: 'app',
};

describe('Update App Setting Task', () => {
  it('Update app setting successfully', async () => {
    const appData = buildAppData();
    const permission = PERMISSION_LEVELS.ADMIN;
    itemService.get = jest.fn().mockResolvedValue(item);
    itemMembershipService.getPermissionLevel = jest.fn().mockResolvedValue(permission);
    appDataService.getById = jest.fn().mockResolvedValue(appData);
    appDataService.update = jest.fn().mockResolvedValue(appData);

    const updateTask = new UpdateAppDataTask(
      GRAASP_ACTOR,
      appData.id,
      data,
      item.id,
      requestDetails,
      appDataService,
      itemService,
      itemMembershipService,
      fileServiceType,
    );

    await updateTask.run(handler);
    expect(appDataService.update).toHaveBeenCalled();
  });

  it('Throw if app data is a file', async () => {
    const fileAppSetting = buildAppData({
      data: buildFileItemData({
        name: 'name',
        type: fileServiceType,
        filename: 'filename',
        filepath: 'filepath',
        size: 120,
        mimetype: 'mimetype',
      }),
    });
    const appData = buildAppData();
    const permission = PERMISSION_LEVELS.ADMIN;
    itemService.get = jest.fn().mockResolvedValue(item);
    itemMembershipService.getPermissionLevel = jest.fn().mockResolvedValue(permission);
    appDataService.getById = jest.fn().mockResolvedValue(appData);
    appDataService.update = jest.fn().mockResolvedValue(appData);

    const updateTask = new UpdateAppDataTask(
      GRAASP_ACTOR,
      fileAppSetting.id,
      data,
      item.id,
      requestDetails,
      appDataService,
      itemService,
      itemMembershipService,
      fileServiceType,
    );

    try {
      await updateTask.run(handler);
    } catch (e) {
      expect(e).toBeInstanceOf(CannotUpdateAppDataFile);
      expect(appDataService.update).not.toHaveBeenCalled();
    }
  });
});
