import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  FileItemType,
  ItemMembershipService,
  ItemService,
  PermissionLevel,
  TaskStatus,
} from '@graasp/sdk';

import {
  AppDataNotFound,
  ItemNotFound,
  MemberCannotReadItem,
  PreventUpdateAppDataFile,
} from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { AppData } from '../interfaces/app-data';
import { BaseAppDataTask } from './base-app-data-task';

export class UpdateAppDataTask extends BaseAppDataTask<Actor, AppData> {
  get name(): string {
    return UpdateAppDataTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private itemId: string;
  private fileItemType: FileItemType;

  /**
   * UpdateAppDataTask constructor
   * @param actor Actor
   * @param appDataId Id of AppData record to update
   * @param data Changes to the AppData
   * @param itemId Id of Item to which AppData belongs
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    appDataId: string,
    data: Partial<AppData>,
    itemId: string,
    requestDetails: AuthTokenSubject,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    fileItemType: FileItemType,
  ) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.data = data;
    this.targetId = appDataId;
    this.itemId = itemId;
    this.fileItemType = fileItemType;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { id: memberId } = this.actor; // extracted from token on task creation - see endpoint
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

    // discard everything except AppData's `data`
    const { data } = this.data;

    // shouldn't update file data
    const originalData = await this.appDataService.getById(this.targetId, handler);
    if (originalData?.data?.type === this.fileItemType) {
      throw new PreventUpdateAppDataFile(originalData);
    }

    // update app data
    let appData;

    if (permission === PermissionLevel.Admin) {
      // updating other member's AppData
      appData = await this.appDataService.update(this.targetId, { data }, handler);
    } else {
      // updating own AppData
      appData = await this.appDataService.update(this.targetId, { data }, handler, memberId);
    }

    if (!appData) throw new AppDataNotFound(this.targetId);

    this.status = TaskStatus.OK;
    this._result = appData;
  }
}
