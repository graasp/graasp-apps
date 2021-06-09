// global
import { FastifyLoggerInstance } from 'fastify';
import {
  Actor, DatabaseTransactionHandler, IndividualResultType,
  ItemMembershipService,
  ItemService,
  Task, TaskStatus
} from 'graasp';
// other services
// local
import { AppDataService } from '../db-service';
import { TokenItemIdMismatch } from '../util/graasp-app-data-error';

export abstract class BaseAppDataTask<R> implements Task<Actor, R> {
  protected itemService: ItemService;
  protected itemMembershipService: ItemMembershipService;
  protected appDataService: AppDataService;
  protected _result: R;
  protected _message: string;

  readonly actor: Actor;

  status: TaskStatus;
  targetId: string;
  data: Partial<IndividualResultType<R>>;

  constructor(actor: Actor,
    appDataService: AppDataService, itemService: ItemService, itemMembershipService: ItemMembershipService) {
    this.actor = actor;
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
    this.status = 'NEW';
  }

  abstract get name(): string;
  get result(): R { return this._result; }
  get message(): string { return this._message; }

  /**
   * Throw `TokenItemIdMismatch` if they don't match
   * @param tokenItemId Target item's id
   */
  protected checkTargetItemAndTokenItemMatch(tokenItemId: string): void {
    if (this.targetId !== tokenItemId) throw new TokenItemIdMismatch();
  }

  abstract run(handler: DatabaseTransactionHandler, log?: FastifyLoggerInstance): Promise<void | BaseAppDataTask<R>[]>;
}
