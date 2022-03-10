// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppSetting } from '../interfaces/app-setting';
import { AppSettingService } from '../db-service';
import { BaseAppSettingTask } from './base-app-setting-task';
import { AuthTokenSubject } from '../../interfaces/request';

type InputType = {
  itemId?: string;
  requestDetails?: AuthTokenSubject;
};

export class GetAppSettingTask extends BaseAppSettingTask<Actor, readonly AppSetting[]> {
  get name(): string {
    return GetAppSettingTask.name;
  }

  input: InputType;
  getInput: () => InputType;

  /**
   * GetAppSettingTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppSettings belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    appSettingService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    input: InputType,
  ) {
    super(actor, appSettingService, itemService, itemMembershipService);
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { requestDetails, itemId } = this.input;
    this.targetId = itemId;

    const { item: tokenItemId } = requestDetails;

    this.checkTargetItemAndTokenItemMatch(itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item's AppSetting w/ no restrictions
    const appSettings = await this.appSettingService.getForItem(itemId, handler);

    this.status = 'OK';
    this._result = appSettings;
  }
}
