import { UpdateAppSettingTask } from './update-app-setting-task';
import { buildAppSetting, GRAASP_ACTOR } from '../../../test/fixtures';
import { AuthTokenSubject } from '../../interfaces/request';
import { AppSettingService } from '../db-service';
import { DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
import { buildFileItemData } from '../../util/utils';
import { CannotUpdateAppSettingFile } from '../../util/graasp-apps-error';

const appSettingService = {} as unknown as AppSettingService;
const itemService = {} as unknown as ItemService;
const itemMembershipService = {} as unknown as ItemMembershipService;
const fileServiceType = 'file';
const handler = {} as unknown as DatabaseTransactionHandler;

const data = { data: { some: 'data' } };
const itemId = 'item-id';
const requestDetails: AuthTokenSubject = {
  member: 'member',
  item: itemId,
  origin: 'origin',
  app: 'app',
};

describe('Update App Setting Task', () => {
  it('Update app setting successfully', async () => {
    const appSetting = buildAppSetting();
    appSettingService.getById = jest.fn().mockResolvedValue(appSetting);
    appSettingService.update = jest.fn().mockResolvedValue(appSetting);

    const updateTask = new UpdateAppSettingTask(
      GRAASP_ACTOR,
      appSetting.id,
      data,
      itemId,
      requestDetails,
      appSettingService,
      itemService,
      itemMembershipService,
      fileServiceType,
    );

    await updateTask.run(handler);
    expect(appSettingService.update).toHaveBeenCalled();
  });

  it('Throw if app data is a file', async () => {
    const fileAppSetting = buildAppSetting({
      data: buildFileItemData({
        name: 'name',
        type: fileServiceType,
        filename: 'filename',
        filepath: 'filepath',
        size: 120,
        mimetype: 'mimetype',
      }),
    });
    appSettingService.getById = jest.fn().mockResolvedValue(fileAppSetting);
    appSettingService.update = jest.fn().mockResolvedValue(fileAppSetting);

    const updateTask = new UpdateAppSettingTask(
      GRAASP_ACTOR,
      fileAppSetting.id,
      data,
      itemId,
      requestDetails,
      appSettingService,
      itemService,
      itemMembershipService,
      fileServiceType,
    );

    try {
      await updateTask.run(handler);
    } catch (e) {
      expect(e).toBeInstanceOf(CannotUpdateAppSettingFile);
      expect(appSettingService.update).not.toHaveBeenCalled();
    }
  });
});
