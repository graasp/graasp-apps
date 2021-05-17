// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../interfaces/request';
import { TokenItemIdMismatch } from '../util/graasp-app-data-error';

export class GetAppDataTask extends BaseAppDataTask<readonly AppData[]> {
  get name(): string { return GetAppDataTask.name; }
  private requestDetails: AuthTokenSubject;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, itemId: string,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.targetId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor; // extracted from token on task creation - see endpoint
    const { item: tokenItemId /* app: appId, origin */ } = this.requestDetails;

    // TODO: when this.targetId !== tokenItemId it means AppX is trying to update AppData for AppY. Allow or block?
    if (this.targetId !== tokenItemId) throw new TokenItemIdMismatch();

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // do we need these checks? maybe not for now because the get is linked to the member

    // get item (token might still be valid but item no longer exists)
    // const item = await this.itemService.get<AppItemExtra>(appItemId, handler);
    // if (!item) throw new ItemNotFound(appItemId);

    // do we need these checks?
    // verify if member can read item (token might still be valid but member can no longer read item)
    // const canRead = await this.itemMembershipService.canRead(memberId, item, handler);
    // if (!canRead) throw new MemberCannotReadItem(appItemId);

    // get all app data for item+member
    const appDatas = await this.appDataService.getAll(this.targetId, handler, memberId);

    this.status = 'OK';
    this._result = appDatas;
  }
}
