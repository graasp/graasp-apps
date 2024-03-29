import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  ItemMembershipService,
  ItemService,
  PermissionLevel,
  TaskStatus,
} from '@graasp/sdk';

import { SingleItemGetFilter } from '../../interfaces/request';
import {
  AppActionNotAccessible,
  ItemNotFound,
  MemberCannotReadItem,
} from '../../util/graasp-apps-error';
import { AppActionService } from '../db-service';
import { AppAction } from '../interfaces/app-action';
import { BaseAppActionTask } from './base-app-action-task';

export class GetAppActionTask extends BaseAppActionTask<readonly AppAction[]> {
  get name(): string {
    return GetAppActionTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private filter: SingleItemGetFilter;

  /**
   * GetAppActionTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppActions belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    itemId: string,
    filter: SingleItemGetFilter,
    requestDetails: AuthTokenSubject,
    appActionService: AppActionService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appActionService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.targetId = itemId;
    this.filter = filter;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(tokenItemId);

    const appItemId = this.targetId;

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appItemId, handler);
    if (!item) throw new ItemNotFound(appItemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appItemId);

    let { memberId: fMemberId } = this.filter;

    if (permission !== PermissionLevel.Admin) {
      if (!fMemberId) {
        fMemberId = memberId;
      } else if (fMemberId !== memberId) {
        throw new AppActionNotAccessible();
      }
    }

    const appActions = await this.appActionService.getForItem(
      this.targetId,
      { memberId: fMemberId },
      handler,
    );

    this.status = TaskStatus.OK;
    this._result = appActions;
  }
}
