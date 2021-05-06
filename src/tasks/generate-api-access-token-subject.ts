// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../interfaces/request';
import { AppItemExtra, APP_ITEM_TYPE } from '../interfaces/app-item';
import {
  InvalidApplicationOrigin, ItemNotFound,
  MemberCannotReadItem, NotAnAppItem
} from '../util/graasp-app-data-error';
import { AppDataService } from '../db-service';

export class GenerateApiAccessTokenSuject extends BaseAppDataTask<AuthTokenSubject> {
  get name(): string { return GenerateApiAccessTokenSuject.name; }
  private appId: string;
  private appOrigin: string;

  constructor(actor: Actor, itemId: string,
    appDetails: { origin: string, app: string }, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);
    this.appId = appDetails.app;
    this.appOrigin = appDetails.origin;
    this.targetId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    // get item
    const item = await this.itemService.get<AppItemExtra>(this.targetId, handler);
    if (!item) throw new ItemNotFound(this.targetId);

    // item must be an app item
    if (item.type !== APP_ITEM_TYPE) throw new NotAnAppItem(this.targetId);

    // verify if member can read item
    const canRead = await this.itemMembershipService.canRead(this.actor.id, item, handler);
    if (!canRead) throw new MemberCannotReadItem(this.targetId);

    // check if app origin is valid (app belongs to a publisher that can use the given origin)
    const valid = await this.appDataService.validAppOrigin(this.appId, this.appOrigin, handler);
    if (!valid) throw new InvalidApplicationOrigin();

    this.status = 'OK';
    this._result = {
      member: this.actor.id,
      item: this.targetId,
      app: this.appId,
      origin: this.appOrigin
    };
  }
}
