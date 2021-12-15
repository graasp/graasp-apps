// other services
import {
  ItemService,
  ItemMembershipService,
  Actor,
  Task,
  ItemTaskManager,
  ItemMembershipTaskManager,
  Item,
} from 'graasp';
// local
import { AppDataService } from './db-service';
import { AppData } from './interfaces/app-data';
import { AuthTokenSubject, ManyItemsGetFilter, SingleItemGetFilter } from '../interfaces/request';
import { CreateAppDataTask } from './tasks/create-app-data-task';
import { DeleteAppDataTask } from './tasks/delete-app-data-task';
import { GetAppDataTask } from './tasks/get-app-data-task';
import { GetItemsAppDataTask } from './tasks/get-items-app-data-task';
import { UpdateAppDataTask } from './tasks/update-app-data-task';
import { GetFileDataInputType, GetFileDataTask } from './tasks/get-file-data-task';

export class TaskManager {
  private appDataService: AppDataService;
  private itemService: ItemService;
  private itemMembershipService: ItemMembershipService;
  private itemTaskManager: ItemTaskManager;
  private itemMembershipTaskManager: ItemMembershipTaskManager;

  constructor(
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    itemTaskManager: ItemTaskManager,
    itemMembershipTaskManager: ItemMembershipTaskManager,
  ) {
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
    this.itemTaskManager = itemTaskManager;
    this.itemMembershipTaskManager = itemMembershipTaskManager;
  }

  getCreateTaskName(): string {
    return CreateAppDataTask.name;
  }
  getGetTaskName(): string {
    return GetAppDataTask.name;
  }
  getUpdateTaskName(): string {
    return UpdateAppDataTask.name;
  }
  getDeleteTaskName(): string {
    return DeleteAppDataTask.name;
  }

  getGetItemsAppDataTaskName(): string {
    return GetItemsAppDataTask.name;
  }

  // CRUD

  /**
   * Create a new AppData CreateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param data AppData (partial) object to create.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns CreateAppDataTask
   */
  createCreateTaskSequence(
    actor: Actor,
    data: Partial<AppData>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    const t1 = this.itemTaskManager.createGetTask(actor, itemId);
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1.result,
      validatePermission: 'write',
    });
    const t3 = new CreateAppDataTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { data, itemId, requestDetails },
    );
    return [t1, t2, t3];
  }

  /**
   * Create a new AppData GetTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param filter Filter object based on the query parameters
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
  createGetTask(
    actor: Actor,
    itemId: string,
    filter: SingleItemGetFilter,
    requestDetails: AuthTokenSubject,
  ): GetAppDataTask {
    return new GetAppDataTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { itemId, filter, requestDetails },
    );
  }
  createGetTaskSequence(
    actor: Actor,
    data: Partial<AppData>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    // check item exists
    const t1 = this.itemTaskManager.createGetTaskSequence(actor, itemId);

    // get permission over item
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1[t1.length - 1].result,
    });

    // get app data
    const t3 = new GetAppDataTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { itemId, requestDetails },
    );
    t3.getInput = () => ({
      permission: t2.result.permission,
    });
    return [...t1, t2, t3];
  }

  /**
   * Create a new AppData UpdateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppData to update.
   * @param data AppData (partial) object with property `data` - the only property that can be updated.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns UpdateAppDataTask
   */
  createUpdateTask(
    actor: Actor,
    appDataId: string,
    data: Partial<AppData>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): UpdateAppDataTask {
    return new UpdateAppDataTask(
      actor,
      appDataId,
      data,
      itemId,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
    );
  }

  /**
   * Create a new AppData DeleteTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppData to delete.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
  createDeleteTask(
    actor: Actor,
    appDataId: string,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): DeleteAppDataTask {
    return new DeleteAppDataTask(
      actor,
      appDataId,
      itemId,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
    );
  }

  // get app data for many items
  createGetItemsAppDataTask(
    actor: Actor,
    filter: ManyItemsGetFilter,
    requestDetails: AuthTokenSubject,
    parentItem?: Item,
  ): GetItemsAppDataTask {
    return new GetItemsAppDataTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { filter, requestDetails, parentItem },
    );
  }

  // get app data for many items
  createGetItemsAppDataTaskSequence(
    actor: Actor,
    filter: ManyItemsGetFilter,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    // get commun parent item
    const { item: tokenItemId } = requestDetails;
    const t1 = this.itemTaskManager.createGetTask(actor, tokenItemId);

    const t2 = new GetItemsAppDataTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { filter, requestDetails },
    );
    t2.getInput = () => ({
      parentItem: t1.result,
    });

    return [t1, t2];
  }

  createGetFileTask(
    actor: Actor,
    input: GetFileDataInputType,
    requestDetails: AuthTokenSubject,
  ): GetFileDataTask {
    const task = new GetFileDataTask(
      actor,
      input,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
    );

    // This is necessary because the graasp-plugin-file use the getResult and by default getResult is undefined
    task.getResult = () => {
      return task.result;
    };
    return task;
  }
}
