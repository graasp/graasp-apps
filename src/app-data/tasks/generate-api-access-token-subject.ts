import {
  Actor,
  DatabaseTransactionHandler,
  Item,
  ItemMembershipService,
  ItemService,
} from 'graasp';

import { APP_ITEM_TYPE } from '../../interfaces/app-item';
import { AuthTokenSubject } from '../../interfaces/request';
import { InvalidApplicationOrigin, NotAnAppItem } from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';

type InputType = {
  item?: Item;
  appDetails?: { origin: string; app: string };
};

export class GenerateApiAccessTokenSujectTask extends BaseAppDataTask<Actor, AuthTokenSubject> {
  get name(): string {
    return GenerateApiAccessTokenSujectTask.name;
  }

  input?: InputType;
  getInput?: () => InputType;

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

    const {
      item,
      appDetails: { origin: appOrigin, app: appId },
    } = this.input;
    this.targetId = item.id;

    // item must be an app item
    if (item.type !== APP_ITEM_TYPE) throw new NotAnAppItem(this.targetId);

    // check if app origin is valid (app belongs to a publisher that can use the given origin)
    const valid = await this.appDataService.validAppOrigin(appId, appOrigin, handler);
    if (!valid) throw new InvalidApplicationOrigin();

    this.status = 'OK';
    this._result = {
      member: this.actor.id,
      item: this.targetId,
      app: appId,
      origin: appOrigin,
    };
  }
}
