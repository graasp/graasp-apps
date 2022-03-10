// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppSetting } from '../interfaces/app-setting';
import { AppSettingService } from '../db-service';
import { BaseAppSettingTask } from './base-app-setting-task';
import { AuthTokenSubject } from '../../interfaces/request';
import {
  AppSettingNotFound,
  ItemNotFound,
  MemberCannotAdminSetting,
  MemberCannotReadItem,
} from '../../util/graasp-apps-error';
import { PERMISSION_LEVELS } from '../../util/constants';

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
    this.status = 'RUNNING';

    const { id: memberId } = this.actor; // extracted from token on task creation - see endpoint
    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(this.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(this.itemId, handler);
    if (!item) throw new ItemNotFound(this.itemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(this.itemId);

    if (permission !== PERMISSION_LEVELS.ADMIN) {
      throw new MemberCannotAdminSetting(memberId);
    }

    const appSetting = await this.appSettingService.delete(this.targetId, handler);

    if (!appSetting) throw new AppSettingNotFound(this.targetId);

    this.status = 'OK';
    this._result = appSetting;
  }
}
