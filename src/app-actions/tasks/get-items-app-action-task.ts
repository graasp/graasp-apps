// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppAction } from '../interfaces/app-action';
import { AppActionService } from '../db-service';
import { BaseAppActionTask } from './base-app-action-task';
import { AuthTokenSubject, ManyItemsGetFilter } from '../../interfaces/request';
import {
  AppActionNotAccessible,
  ItemNotFound,
  MemberCannotReadItem,
} from '../../util/graasp-apps-error';

export class GetItemsAppActionTask extends BaseAppActionTask<readonly AppAction[]> {
  get name(): string {
    return GetItemsAppActionTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private filter: ManyItemsGetFilter;

  /**
   * GetItemsAppActionTask constructor
   * @param actor Actor
   * @param filter Filter
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    filter: ManyItemsGetFilter,
    requestDetails: AuthTokenSubject,
    appActionService: AppActionService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appActionService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.filter = filter;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    // get item
    const item = await this.itemService.get(tokenItemId, handler);
    if (!item) throw new ItemNotFound(tokenItemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(tokenItemId);

    const { itemId: itemIds } = this.filter;
    let { memberId: fMemberId } = this.filter;

    if (permission !== 'admin') {
      if (!fMemberId) {
        fMemberId = memberId;
      } else if (fMemberId !== memberId) {
        throw new AppActionNotAccessible();
      }
    }

    const appActions = await this.appActionService.getForItems(
      itemIds,
      item,
      { memberId: fMemberId },
      handler,
    );

    this.status = 'OK';
    this._result = appActions;
  }
}
