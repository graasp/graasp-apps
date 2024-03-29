import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  FileItemExtra,
  FileItemType,
  ItemMembershipService,
  ItemService,
  PermissionLevel,
  TaskStatus,
} from '@graasp/sdk';
import { getFileExtra } from 'graasp-plugin-file-item';

import {
  AppDataNotAccessible,
  ItemNotFound,
  MemberCannotReadItem,
} from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';

export type GetFileDataInputType = {
  appDataId?: string;
  fileItemType?: FileItemType;
};

export class GetFileDataTask extends BaseAppDataTask<
  Actor,
  { filepath: string; mimetype: string }
> {
  get name(): string {
    return GetFileDataTask.name;
  }
  private requestDetails: AuthTokenSubject;

  public input: GetFileDataInputType;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    input: GetFileDataInputType,
    requestDetails: AuthTokenSubject,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    const { appDataId, fileItemType } = this.input;
    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    const appData = await this.appDataService.getById(appDataId, handler);

    this.checkTargetItemAndTokenItemMatch(appData.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appData.itemId, handler);
    if (!item) throw new ItemNotFound(appData.itemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appData.itemId);

    if (permission !== PermissionLevel.Admin) {
      // members are only allowed to download their items
      if (appData.memberId !== memberId && appData.visibility === 'member') {
        throw new AppDataNotAccessible();
      }
    }
    const extra = getFileExtra(fileItemType, appData.data.extra as FileItemExtra);

    this._result = {
      filepath: extra.path,
      mimetype: extra.mimetype,
    };
    this.status = TaskStatus.OK;
  }
}
