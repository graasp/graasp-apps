// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject, ManyItemsGetFilter } from '../../interfaces/request';
import { AppDataNotAccessible, ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';

export class GetItemsAppDataTask extends BaseAppDataTask<readonly AppData[]> {
  get name(): string { return GetItemsAppDataTask.name; }
  private requestDetails: AuthTokenSubject;
  private filter: ManyItemsGetFilter;

  /**
   * GetItemsAppDataTask constructor
   * @param actor Actor
   * @param filter Filter
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, filter: ManyItemsGetFilter,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.filter = filter;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item
    const item = await this.itemService.get(tokenItemId, handler);
    if (!item) throw new ItemNotFound(tokenItemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(tokenItemId);

    const { itemId: itemIds } = this.filter;
    let { visibility: fVisibility, memberId: fMemberId } = this.filter;
    let appDatas: readonly AppData[];

    if (permission === 'admin') {
      // get items' AppData w/ no restrictions
      appDatas = await this.appDataService
        .getForItems(itemIds, item, { memberId: fMemberId, visibility: fVisibility }, handler);
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
        .getForItems(itemIds, item, { memberId: fMemberId, visibility: fVisibility, op }, handler);
    }

    this.status = 'OK';
    this._result = appDatas;
  }
}
