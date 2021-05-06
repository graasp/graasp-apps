// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppData } from '../interfaces/app-data';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../interfaces/request';
import { ItemNotFound, MemberCannotReadItem, TokenItemIdMismatch } from '../util/graasp-app-data-error';

export class CreateAppDataTask extends BaseAppDataTask<AppData> {
  get name(): string { return CreateAppDataTask.name; }
  private requestDetails: AuthTokenSubject;

  constructor(actor: Actor, data: Partial<AppData>, itemId: string,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);
    // super(actor, requestDetails, appDataService);
    this.requestDetails = requestDetails;
    this.data = data;
    // Item to which the created AppData will be related to
    this.targetId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { id: memberId } = this.actor; // extracted from token on task creation - see create endpoint
    const { item: tokenItemId /* app: appId, origin */ } = this.requestDetails;

    // TODO: when this.targetId !== tokenItemId it means AppX is trying to create AppData for AppY. Allow or block?
    if (this.targetId !== tokenItemId) throw new TokenItemIdMismatch();

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration even if the app/origin are no londer valid (removed from db)

    const appItemId = this.targetId;

    // get item (token might still be valid but item no longer exists)
    // TODO: is this check really necessary?
    const item = await this.itemService.get(appItemId, handler);
    if (!item) throw new ItemNotFound(appItemId);

    // verify if member can read item (token might still be valid but member can no longer read item)
    // TODO: is this check really necessary?
    const canRead = await this.itemMembershipService.canRead(memberId, item, handler);
    if (!canRead) throw new MemberCannotReadItem(appItemId);

    // const { ownership: o, visibility: v } = this.data;
    // if (o === 'app' || o === 'publisher' || v === 'app' || v === 'publisher') {
    //   if (!appId || !origin) throw new Error();
    //   // check if there's an app w/ the given `appId` which belongs to a publisher that owns `origin`
    // }

    const data = Object.assign({}, this.data, { memberId, itemId: appItemId });

    // create app data
    const appData = await this.appDataService.create(data, handler);

    this.status = 'OK';
    this._result = appData;
  }
}
