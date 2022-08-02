import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  ItemMembershipService,
  ItemService,
  PermissionLevel,
  TaskStatus,
} from '@graasp/sdk';

import { ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';
import { AppActionService } from '../db-service';
import { AppAction } from '../interfaces/app-action';
import { BaseAppActionTask } from './base-app-action-task';

export class CreateAppActionTask extends BaseAppActionTask<AppAction> {
  get name(): string {
    return CreateAppActionTask.name;
  }
  private requestDetails: AuthTokenSubject;

  constructor(
    actor: Actor,
    data: Partial<AppAction>,
    itemId: string,
    requestDetails: AuthTokenSubject,
    appActionService: AppActionService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appActionService, itemService, itemMembershipService);
    this.requestDetails = requestDetails;
    this.data = data;
    // Item to which the created AppAction will be related to
    this.targetId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { id: memberId } = this.actor; // extracted from token on task creation - see create endpoint
    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration even if the app/origin are no londer valid (removed from db)

    const appItemId = this.targetId;

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appItemId, handler);
    if (!item) throw new ItemNotFound(appItemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appItemId);

    let data: Partial<AppAction>;

    if (permission === PermissionLevel.Admin) {
      const appActionMemberId = this.data.memberId ?? memberId;
      data = Object.assign({}, this.data, { memberId: appActionMemberId, itemId: appItemId });
    } else {
      data = Object.assign({}, this.data, { memberId: memberId, itemId: appItemId });
    }

    // create app action
    const appAction = await this.appActionService.create(data, handler);

    this.status = TaskStatus.OK;
    this._result = appAction;
  }
}
