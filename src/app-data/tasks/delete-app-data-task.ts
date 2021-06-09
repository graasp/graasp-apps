// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../../interfaces/request';
import { AppDataNotFound, ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';

export class DeleteAppDataTask extends BaseAppDataTask<AppData> {
  get name(): string { return DeleteAppDataTask.name; }
  private requestDetails: AuthTokenSubject;
  private itemId: string;

  /**
   * DeleteAppDataTask constructor
   * @param actor Actor
   * @param appDataId Id of AppData record to delete
   * @param itemId Id of Item to which AppData belongs
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, appDataId: string, itemId: string,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.targetId = appDataId;
    this.itemId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor; // extracted from token on task creation - see endpoint
    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    const appItemId = this.targetId;

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appItemId, handler);
    if (!item) throw new ItemNotFound(appItemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appItemId);

    // delete app data
    let appData;

    if (permission === 'admin') {
      // deleting other member's AppData
      appData = await this.appDataService.delete(this.targetId, handler);
    } else {
      // deleting own AppData
      appData = await this.appDataService.delete(this.targetId, handler, memberId);
    }

    if (!appData) throw new AppDataNotFound(this.targetId);

    this.status = 'OK';
    this._result = appData;
  }
}
