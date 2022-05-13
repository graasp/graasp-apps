import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';

import { AuthTokenSubject } from '../../interfaces/request';
import { AppDataService } from '../db-service';
import { AppData } from '../interfaces/app-data';
import { BaseAppDataTask } from './base-app-data-task';

type InputType = {
  data: Partial<AppData>;
  itemId: string;
  requestDetails: AuthTokenSubject;
  permission?: string;
};
export class CreateAppDataTask extends BaseAppDataTask<Actor, AppData> {
  input?: InputType;
  getInput?: () => InputType;

  get name(): string {
    return CreateAppDataTask.name;
  }

  constructor(
    actor: Actor,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    input: InputType,
  ) {
    super(actor, appDataService, itemService, itemMembershipService);
    // Item to which the created AppData will be related to
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { requestDetails, itemId, permission, data } = this.input;
    const { id: memberId } = this.actor; // extracted from token on task creation - see create endpoint
    const { item: tokenItemId } = requestDetails;

    this.checkTargetItemAndTokenItemMatch(itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration even if the app/origin are no londer valid (removed from db)

    let completeData: Partial<AppData>;

    if (permission === 'admin') {
      const appDataMemberId = this.data.memberId ?? memberId;
      completeData = Object.assign({}, data, {
        memberId: appDataMemberId,
        creator: memberId,
        itemId,
      });
    } else {
      completeData = Object.assign({}, data, { memberId: memberId, creator: memberId, itemId });
    }

    // create app data
    const appData = await this.appDataService.create(completeData, handler);

    this.status = 'OK';
    this._result = appData;
  }
}
