import { FastifyLoggerInstance } from 'fastify';

import {
  Actor,
  DatabaseTransactionHandler,
  IndividualResultType,
  ItemMembershipService,
  ItemService,
  PostHookHandlerType,
  PreHookHandlerType,
  Task,
  TaskStatus,
} from '@graasp/sdk';

import { TokenItemIdMismatch } from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';

export abstract class BaseAppDataTask<A extends Actor, R> implements Task<A, R> {
  protected itemService: ItemService;
  protected itemMembershipService: ItemMembershipService;
  protected appDataService: AppDataService;

  protected _result: R;
  protected _message: string;
  readonly actor: A;
  protected _partialSubtasks: boolean;

  status: TaskStatus;
  targetId: string;
  data: Partial<IndividualResultType<R>>;
  preHookHandler?: PreHookHandlerType<R>;
  postHookHandler?: PostHookHandlerType<R>;

  input?: unknown;
  skip?: boolean;

  getInput?: () => unknown;
  getResult?: () => unknown;

  constructor(
    actor: A,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    this.actor = actor;
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
    this.status = TaskStatus.NEW;
  }

  abstract get name(): string;
  get result(): R {
    return this._result;
  }
  get message(): string {
    return this._message;
  }
  get partialSubtasks(): boolean {
    return this._partialSubtasks;
  }

  /**
   * Throw `TokenItemIdMismatch` if they don't match
   * @param itemId1 itemId in the request's path
   * @param itemId2 itemId in the auth token
   */
  protected checkTargetItemAndTokenItemMatch(itemId1: string, itemId2: string): void {
    if (itemId1 !== itemId2) throw new TokenItemIdMismatch();
  }

  abstract run(
    handler: DatabaseTransactionHandler,
    log: FastifyLoggerInstance,
  ): Promise<void | Task<A, R>[]>;
}
