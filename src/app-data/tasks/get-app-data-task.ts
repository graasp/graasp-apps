// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject, SingleItemGetFilter } from '../../interfaces/request';
import { AppDataNotAccessible, ItemNotFound, MemberCannotReadItem, TokenItemIdMismatch } from '../../util/graasp-apps-error';

export class GetAppDataTask extends BaseAppDataTask<readonly AppData[]> {
  get name(): string { return GetAppDataTask.name; }
  private requestDetails: AuthTokenSubject;
  private filter: SingleItemGetFilter;
  private itemId: string;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, itemId: string, filter: SingleItemGetFilter,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.itemId = itemId;
    this.filter = filter;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor;
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

    let { visibility: fVisibility, memberId: fMemberId } = this.filter;
    let appDatas: readonly AppData[];

    if (permission === 'admin') {
      // get item's AppData w/ no restrictions
      appDatas = await this.appDataService
        .getForItem(this.itemId, { memberId: fMemberId, visibility: fVisibility }, handler);
    } else {
      // get member's AppData or others' AppData w/ visibility 'item'
      let op;

      if (!fMemberId) {
        if (fVisibility !== 'item') {
          fMemberId = memberId; // get member's AppData
          if (!fVisibility) { // + any AppData w/ visibility 'item'
            fVisibility = 'item';
            op = 'OR';
          }
        }
      } else if (fMemberId !== memberId) {
        if (fVisibility !== 'item') {
          if (fVisibility === 'member') throw new AppDataNotAccessible();
          fVisibility = 'item'; // force 'item' visibility while fetching others' AppData
        }
      }

      appDatas = await this.appDataService
        .getForItem(this.itemId, { memberId: fMemberId, visibility: fVisibility, op }, handler);
    }

    this.status = 'OK';
    this._result = appDatas;
  }
}
