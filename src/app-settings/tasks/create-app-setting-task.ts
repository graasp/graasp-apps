import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';

import { AuthTokenSubject } from '../../interfaces/request';
import { AppSettingService } from '../db-service';
import { AppSetting } from '../interfaces/app-setting';
import { BaseAppSettingTask } from './base-app-setting-task';

type InputType = {
  data: Partial<AppSetting>;
  itemId: string;
  requestDetails: AuthTokenSubject;
  permission?: string;
};
export class CreateAppSettingTask extends BaseAppSettingTask<Actor, AppSetting> {
  input?: InputType;
  getInput?: () => InputType;

  get name(): string {
    return CreateAppSettingTask.name;
  }

  constructor(
    actor: Actor,
    appSettingService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    input: InputType,
  ) {
    super(actor, appSettingService, itemService, itemMembershipService);
    // Item to which the created AppSetting will be related to
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { requestDetails, itemId, data } = this.input;
    const { id: memberId } = this.actor; // extracted from token on task creation - see create endpoint
    const { item: tokenItemId } = requestDetails;

    this.checkTargetItemAndTokenItemMatch(itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration even if the app/origin are no londer valid (removed from db)

    const completeData = Object.assign({}, data, {
      creator: memberId,
      itemId,
    });

    // create app data
    const appSetting = await this.appSettingService.create(completeData, handler);

    this.status = 'OK';
    this._result = appSetting;
  }
}
