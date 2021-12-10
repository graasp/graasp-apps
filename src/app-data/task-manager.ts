// other services
import { ItemService, ItemMembershipService, Actor } from 'graasp';
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

  constructor(
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService
  ) {
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
  }

  getCreateTaskName(): string { return CreateAppDataTask.name; }
  getGetTaskName(): string { return GetAppDataTask.name; }
  getUpdateTaskName(): string { return UpdateAppDataTask.name; }
  getDeleteTaskName(): string { return DeleteAppDataTask.name; }

  getGetItemsAppDataTaskName(): string { return GetItemsAppDataTask.name; }

  // CRUD

  /**
   * Create a new AppData CreateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param data AppData (partial) object to create.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns CreateAppDataTask
   */
  createCreateTask(actor: Actor, data: Partial<AppData>, itemId: string, requestDetails: AuthTokenSubject): CreateAppDataTask {
    return new CreateAppDataTask(actor, data, itemId, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  /**
   * Create a new AppData GetTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param filter Filter object based on the query parameters
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
  createGetTask(actor: Actor, itemId: string, filter: SingleItemGetFilter, requestDetails: AuthTokenSubject): GetAppDataTask {
    return new GetAppDataTask(actor, itemId, filter, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
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
  createUpdateTask(actor: Actor, appDataId: string, data: Partial<AppData>, itemId: string, requestDetails: AuthTokenSubject): UpdateAppDataTask {
    return new UpdateAppDataTask(actor, appDataId, data, itemId, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  /**
   * Create a new AppData DeleteTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppData to delete.
   * @param itemId Id of item (app item) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
  createDeleteTask(actor: Actor, appDataId: string, itemId: string, requestDetails: AuthTokenSubject): DeleteAppDataTask {
    return new DeleteAppDataTask(actor, appDataId, itemId, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  // Other
  createGetItemsAppDataTask(actor: Actor, filter: ManyItemsGetFilter, requestDetails: AuthTokenSubject): GetItemsAppDataTask {
    return new GetItemsAppDataTask(actor, filter, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  createGetFileTask(actor: Actor, input: GetFileDataInputType, requestDetails: AuthTokenSubject): GetFileDataTask {
    const task = new GetFileDataTask(actor, input, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);

    // This is necessary because the graasp-plugin-file use the getResult and by default getResult is undefined
    task.getResult = () => { return task.result; };
    return task;
  }
}
