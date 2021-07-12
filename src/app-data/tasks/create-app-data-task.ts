// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../../interfaces/request';
import { ItemNotFound, MemberCannotReadItem, TokenItemIdMismatch } from '../../util/graasp-apps-error';

export class CreateAppDataTask extends BaseAppDataTask<AppData> {
  get name(): string { return CreateAppDataTask.name; }
  private requestDetails: AuthTokenSubject;
  private itemId: string;

  constructor(actor: Actor, data: Partial<AppData>, itemId: string,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);
    this.requestDetails = requestDetails;
    this.data = data;
    // Item to which the created AppData will be related to
    this.itemId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor; // extracted from token on task creation - see create endpoint
    const { item: tokenItemId } = this.requestDetails;

    this.checkTargetItemAndTokenItemMatch(this.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration even if the app/origin are no londer valid (removed from db)

    // get item (token might still be valid but item no longer exists)
    // TODO: is this check really necessary?
    const item = await this.itemService.get(this.itemId, handler);
    if (!item) throw new ItemNotFound(this.itemId);

    // get member's permission over item
    // TODO: is there a better way to do this?
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(this.itemId);

    let data: Partial<AppData>;

    if (permission === 'admin') {
      const appDataMemberId = this.data.memberId ?? memberId;
      data = Object.assign({}, this.data, { memberId: appDataMemberId, creator: memberId, itemId: this.itemId });
    } else {
      data = Object.assign({}, this.data, { memberId: memberId, creator: memberId, itemId: this.itemId });
    }

    // create app data
    const appData = await this.appDataService.create(data, handler);

    this.status = 'OK';
    this._result = appData;
  }
}
