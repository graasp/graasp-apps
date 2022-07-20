import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  ItemMembershipService,
  ItemService,
  TaskStatus,
} from '@graasp/sdk';

import { AppSettingNotFound } from '../../util/graasp-apps-error';
import { AppSettingService } from '../db-service';
import { AppSetting } from '../interfaces/app-setting';
import { BaseAppSettingTask } from './base-app-setting-task';

export class DeleteAppSettingTask extends BaseAppSettingTask<Actor, AppSetting> {
  get name(): string {
    return DeleteAppSettingTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private itemId: string;

  /**
   * DeleteAppSettingTask constructor
   * @param actor Actor
   * @param appSettingId Id of AppSetting record to delete
   * @param itemId Id of Item to which AppSetting belongs
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    appSettingId: string,
    itemId: string,
    requestDetails: AuthTokenSubject,
    appSettingService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appSettingService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.targetId = appSettingId;
    this.itemId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(this.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    const appSetting = await this.appSettingService.delete(this.targetId, handler);

    if (!appSetting) throw new AppSettingNotFound(this.targetId);

    this.status = TaskStatus.OK;
    this._result = appSetting;
  }
}
