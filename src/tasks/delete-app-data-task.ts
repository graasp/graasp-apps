// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../interfaces/request';
import { TokenItemIdMismatch } from '../util/graasp-app-data-error';

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
    const { item: tokenItemId /* app: appId, origin */ } = this.requestDetails;
    // const appItemId = this.itemId;

    // TODO: when this.targetId !== tokenItemId it means AppX is trying to delete AppData for AppY. Allow or block?
    if (this.itemId !== tokenItemId) throw new TokenItemIdMismatch();

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // do we need these checks? maybe not for now because the delete is linked to the member

    // get item (token might still be valid but item no longer exists)
    // const item = await this.itemService.get(appItemId, handler);
    // if (!item) throw new ItemNotFound(appItemId);

    // verify if member can read item (token might still be valid but member can no longer read item)
    // const canRead = await this.itemMembershipService.canRead(memberId, item, handler);
    // if (!canRead) throw new MemberCannotReadItem(appItemId);

    // delete app data - id of member making the delete needs to match AppData's `member_id`
    const appData = await this.appDataService.delete(this.targetId, handler, memberId);
    // TODO: should this fail here?
    // if (!appData) throw new CantDeleteAppData();

    this.status = 'OK';
    this._result = appData;
  }
}
