import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  FileItemExtra,
  FileItemType,
  ItemMembershipService,
  ItemService,
  TaskStatus,
} from '@graasp/sdk';
import { getFileExtra } from 'graasp-plugin-file-item';

import { ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';
import { AppSettingService } from '../db-service';
import { BaseAppSettingTask } from './base-app-setting-task';

export type GetFileDataInputType = {
  appSettingId?: string;
  fileItemType?: FileItemType;
};

export class GetFileDataTask extends BaseAppSettingTask<
  Actor,
  { filepath: string; mimetype: string }
> {
  get name(): string {
    return GetFileDataTask.name;
  }
  private requestDetails: AuthTokenSubject;

  public input: GetFileDataInputType;

  /**
   * GetAppSettingTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppSettings belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    input: GetFileDataInputType,
    requestDetails: AuthTokenSubject,
    appSettingService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appSettingService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { appSettingId, fileItemType } = this.input;
    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    const appSetting = await this.appSettingService.getById(appSettingId, handler);

    this.checkTargetItemAndTokenItemMatch(appSetting.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appSetting.itemId, handler);
    if (!item) throw new ItemNotFound(appSetting.itemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appSetting.itemId);

    const extra = getFileExtra(fileItemType, appSetting.data.extra as FileItemExtra);

    this._result = {
      filepath: extra.path,
      mimetype: extra.mimetype,
    };
    this.status = TaskStatus.OK;
  }
}
