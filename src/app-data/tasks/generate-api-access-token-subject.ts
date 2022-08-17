import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  Item,
  ItemMembershipService,
  ItemService,
  ItemType,
  TaskStatus,
} from '@graasp/sdk';

import { InvalidApplicationOrigin, NotAppItem } from '../../util/graasp-apps-error';
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
    this.status = TaskStatus.RUNNING;

    const {
      item,
      appDetails: { origin: appOrigin, app: appId },
    } = this.input;
    this.targetId = item.id;

    // item must be an app item
    if (item.type !== ItemType.APP) throw new NotAppItem(this.targetId);

    // check if app origin is valid (app belongs to a publisher that can use the given origin)
    const valid = await this.appDataService.validAppOrigin(appId, appOrigin, handler);
    if (!valid) throw new InvalidApplicationOrigin();

    this.status = TaskStatus.OK;
    this._result = {
      member: this.actor.id,
      item: this.targetId,
      app: appId,
      origin: appOrigin,
    };
  }
}
