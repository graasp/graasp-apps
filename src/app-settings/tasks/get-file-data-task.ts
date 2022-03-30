// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppSettingService } from '../db-service';
import { BaseAppSettingTask } from './base-app-setting-task';
import { AuthTokenSubject } from '../../interfaces/request';
import { ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';
import { FileItemExtra, ServiceMethod } from 'graasp-plugin-file';
import { getFileExtra } from 'graasp-plugin-file-item';

export type GetFileDataInputType = {
  appSettingId?: string;
  serviceMethod?: ServiceMethod;
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
    this.status = 'RUNNING';

    const { appSettingId, serviceMethod } = this.input;
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

    const extra = getFileExtra(serviceMethod, appSetting.data.extra as FileItemExtra);

    this._result = {
      filepath: extra.path,
      mimetype: extra.mimetype,
    };
    this.status = 'OK';
  }
}
