import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';

import { AuthTokenSubject, SingleItemGetFilter } from '../../interfaces/request';
import { AppDataNotAccessible } from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { AppData } from '../interfaces/app-data';
import { BaseAppDataTask } from './base-app-data-task';

type InputType = {
  itemId?: string;
  filter?: SingleItemGetFilter;
  requestDetails?: AuthTokenSubject;
  permission?: string;
};

export class GetAppDataTask extends BaseAppDataTask<Actor, readonly AppData[]> {
  get name(): string {
    return GetAppDataTask.name;
  }

  input: InputType;
  getInput: () => InputType;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
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
    this.status = 'RUNNING';

    const { requestDetails, itemId, filter, permission } = this.input;
    this.targetId = itemId;

    const { id: memberId } = this.actor;
    const { item: tokenItemId } = requestDetails;

    this.checkTargetItemAndTokenItemMatch(itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    let { visibility: fVisibility, memberId: fMemberId } = filter;
    let appDatas: readonly AppData[];

    if (permission === 'admin') {
      // get item's AppData w/ no restrictions
      appDatas = await this.appDataService.getForItem(
        itemId,
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

      appDatas = await this.appDataService.getForItem(
        itemId,
        { memberId: fMemberId, visibility: fVisibility, op },
        handler,
      );
    }

    this.status = 'OK';
    this._result = appDatas;
  }
}
