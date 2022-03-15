// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppSetting } from '../interfaces/app-setting';
import { AppSettingService } from '../db-service';
import { BaseAppSettingTask } from './base-app-setting-task';
import { AuthTokenSubject } from '../../interfaces/request';
import { AppSettingNotFound } from '../../util/graasp-apps-error';

export class UpdateAppSettingTask extends BaseAppSettingTask<Actor, AppSetting> {
  get name(): string {
    return UpdateAppSettingTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private itemId: string;

  /**
   * UpdateAppSettingTask constructor
   * @param actor Actor
   * @param appSettingId Id of AppSetting record to update
   * @param data Changes to the AppSetting
   * @param itemId Id of Item to which AppSetting belongs
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    appSettingId: string,
    data: Partial<AppSetting>,
    itemId: string,
    requestDetails: AuthTokenSubject,
    appSettingService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appSettingService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.data = data;
    this.targetId = appSettingId;
    this.itemId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(this.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // discard everything except AppSetting's `data`
    const { data } = this.data;

    // updating other member's AppSetting
    const appSetting = await this.appSettingService.update(this.targetId, { data }, handler);

    if (!appSetting) throw new AppSettingNotFound(this.targetId);

    this.status = 'OK';
    this._result = appSetting;
  }
}