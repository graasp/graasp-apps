// other services
import { ItemService, ItemMembershipService, Actor } from 'graasp';
// local
import { AppDataService } from './db-service';
import { AppData } from './interfaces/app-data';
import { AuthTokenSubject } from './interfaces/request';
import { CreateAppDataTask } from './tasks/create-app-data-task';
import { DeleteAppDataTask } from './tasks/delete-app-data-task';
import { GenerateApiAccessTokenSuject } from './tasks/generate-api-access-token-subject';
import { GetAppDataTask } from './tasks/get-app-data-task';
import { UpdateAppDataTask } from './tasks/update-app-data-task';

export class TaskManager {
  private appDataService: AppDataService;
  private itemService: ItemService;
  private itemMembershipService: ItemMembershipService;

  constructor(
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService
  ) {
    this.appDataService = appDataService,
      this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
  }

  getCreateTaskName(): string { return CreateAppDataTask.name; }
  getGetTaskName(): string { return GetAppDataTask.name; }
  getUpdateTaskName(): string { return UpdateAppDataTask.name; }
  getDeleteTaskName(): string { return DeleteAppDataTask.name; }

  getGenerateApiAccessTokenSujectName(): string { return GenerateApiAccessTokenSuject.name; }

  // CRUD

  /**
   * Create a new AppData CreateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param data AppData (partial) object to create.
   * - `data.memberId` can be different from `actor.id` - admin member creating AppData for another member.
   * - `data.itemId` ignored - will be overwritten by `itemId`.
   * @param itemId Id of item (AppItem) to which the new AppData will be bond to.
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
   * @param appDataId Id of AppData to delete.
   * @param itemId Id of item (AppItem) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
   createGetTask(actor: Actor, itemId: string, requestDetails: AuthTokenSubject): GetAppDataTask {
    return new GetAppDataTask(actor, itemId, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  /**
   * Create a new AppData UpdateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppData to update.
   * @param data AppData (partial) object with property `data` - the only property that can be updated.
   * @param itemId Id of item (AppItem) to which the new AppData will be bond to.
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
   * @param itemId Id of item (AppItem) to which the new AppData will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppDataTask
   */
  createDeleteTask(actor: Actor, appDataId: string, itemId: string, requestDetails: AuthTokenSubject): DeleteAppDataTask {
    return new DeleteAppDataTask(actor, appDataId, itemId, requestDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }

  // Other
  createGenerateApiAccessTokenSubject(actor: Actor, itemId: string,
    appDetails: { origin: string, app: string }): GenerateApiAccessTokenSuject {
    return new GenerateApiAccessTokenSuject(actor, itemId, appDetails,
      this.appDataService, this.itemService, this.itemMembershipService);
  }
}
