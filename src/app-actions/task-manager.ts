import { Actor, AuthTokenSubject, ItemMembershipService, ItemService } from '@graasp/sdk';

import { ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { AppActionService } from './db-service';
import { AppAction } from './interfaces/app-action';
import { CreateAppActionTask } from './tasks/create-app-action-task';
import { GetAppActionTask } from './tasks/get-app-action-task';
import { GetItemsAppActionTask } from './tasks/get-items-app-action-task';

export class TaskManager {
  private appActionService: AppActionService;
  private itemService: ItemService;
  private itemMembershipService: ItemMembershipService;

  constructor(
    appActionService: AppActionService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    this.appActionService = appActionService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
  }

  getCreateTaskName(): string {
    return CreateAppActionTask.name;
  }
  getGetTaskName(): string {
    return GetAppActionTask.name;
  }

  getGetItemsAppActionTaskName(): string {
    return GetItemsAppActionTask.name;
  }

  /**
   * Create a new AppAction CreateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param data AppAction (partial) object to create.
   * @param itemId Id of item (app item) to which the new AppAction will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns CreateAppActionTask
   */
  createCreateTask(
    actor: Actor,
    data: Partial<AppAction>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): CreateAppActionTask {
    return new CreateAppActionTask(
      actor,
      data,
      itemId,
      requestDetails,
      this.appActionService,
      this.itemService,
      this.itemMembershipService,
    );
  }

  /**
   * Create a new AppAction GetTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param itemId Id of item (app item) to which the new AppAction will be bond to.
   * @param filter Filter object based on the query parameters
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppActionTask
   */
  createGetTask(
    actor: Actor,
    itemId: string,
    filter: SingleItemGetFilter,
    requestDetails: AuthTokenSubject,
  ): GetAppActionTask {
    return new GetAppActionTask(
      actor,
      itemId,
      filter,
      requestDetails,
      this.appActionService,
      this.itemService,
      this.itemMembershipService,
    );
  }

  createGetItemsAppActionTask(
    actor: Actor,
    filter: ManyItemsGetFilter,
    requestDetails: AuthTokenSubject,
  ): GetItemsAppActionTask {
    return new GetItemsAppActionTask(
      actor,
      filter,
      requestDetails,
      this.appActionService,
      this.itemService,
      this.itemMembershipService,
    );
  }
}
