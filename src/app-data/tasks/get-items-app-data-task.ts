import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  Item,
  ItemMembershipService,
  ItemService,
  PermissionLevel,
  TaskStatus,
} from '@graasp/sdk';

import { ManyItemsGetFilter } from '../../interfaces/request';
import { AppDataNotAccessible } from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { AppData } from '../interfaces/app-data';
import { BaseAppDataTask } from './base-app-data-task';

type InputType = {
  filter: ManyItemsGetFilter;
  requestDetails: AuthTokenSubject;
  permission?: string;
  parentItem?: Item;
};

export class GetItemsAppDataTask extends BaseAppDataTask<Actor, readonly AppData[]> {
  get name(): string {
    return GetItemsAppDataTask.name;
  }
  input: InputType;

  /**
   * GetItemsAppDataTask constructor
   * @param actor Actor
   * @param filter Filter
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    input: InputType,
  ) {
    super(actor, appDataService, itemService, itemMembershipService);
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { id: memberId } = this.actor;
    const { permission, filter, parentItem } = this.input;

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // at most the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    const { itemId: itemIds } = filter;
    let { visibility: fVisibility, memberId: fMemberId } = filter;
    let appDatas: readonly AppData[];

    if (permission === PermissionLevel.Admin) {
      // get items' AppData w/o restrictions
      appDatas = await this.appDataService.getForItems(
        itemIds,
        parentItem,
        { memberId: fMemberId, visibility: fVisibility },
        handler,
      );
    } else {
      // get member's AppData or others' AppData w/ visibility 'item'
      let op;

      if (!fMemberId) {
        if (fVisibility !== 'item') {
          fMemberId = memberId; // get member's AppData
          if (!fVisibility) {
            // + any AppData w/ visibility 'item'
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

      appDatas = await this.appDataService.getForItems(
        itemIds,
        parentItem,
        { memberId: fMemberId, visibility: fVisibility, op },
        handler,
      );
    }

    this.status = TaskStatus.OK;
    this._result = appDatas;
  }
}
