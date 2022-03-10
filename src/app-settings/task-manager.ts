// other services
import {
  ItemService,
  ItemMembershipService,
  Actor,
  Task,
  ItemTaskManager,
  ItemMembershipTaskManager,
} from 'graasp';
// local
import { AppSettingService } from './db-service';
import { AppSetting } from './interfaces/app-setting';
import { AuthTokenSubject, SingleItemGetFilter } from '../interfaces/request';
import { CreateAppSettingTask } from './tasks/create-app-setting-task';
import { DeleteAppSettingTask } from './tasks/delete-app-setting-task';
import { GetAppSettingTask } from './tasks/get-app-setting-task';
import { UpdateAppSettingTask } from './tasks/update-app-setting-task';
import { GetFileDataInputType, GetFileDataTask } from './tasks/get-file-data-task';
import { PERMISSION_LEVELS } from '../util/constants';

export class TaskManager {
  private appDataService: AppSettingService;
  private itemService: ItemService;
  private itemMembershipService: ItemMembershipService;
  private itemTaskManager: ItemTaskManager;
  private itemMembershipTaskManager: ItemMembershipTaskManager;

  constructor(
    appDataService: AppSettingService,
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
    return CreateAppSettingTask.name;
  }
  getGetTaskName(): string {
    return GetAppSettingTask.name;
  }
  getUpdateTaskName(): string {
    return UpdateAppSettingTask.name;
  }
  getDeleteTaskName(): string {
    return DeleteAppSettingTask.name;
  }

  /**
   * Create a new AppSetting CreateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param data AppSetting (partial) object to create.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns CreateAppSettingTask
   */
  createCreateTaskSequence(
    actor: Actor,
    data: Partial<AppSetting>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    const t1 = this.itemTaskManager.createGetTask(actor, itemId);
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1.result,
      validatePermission: PERMISSION_LEVELS.ADMIN,
    });
    const t3 = new CreateAppSettingTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { data, itemId, requestDetails },
    );
    return [t1, t2, t3];
  }

  /**
   * Create a new AppSetting GetTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param filter Filter object based on the query parameters
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppSettingTask
   */
  createGetTask(
    actor: Actor,
    itemId: string,
    filter: SingleItemGetFilter,
    requestDetails: AuthTokenSubject,
  ): GetAppSettingTask {
    return new GetAppSettingTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { itemId, filter, requestDetails },
    );
  }
  createGetTaskSequence(
    actor: Actor,
    data: Partial<AppSetting>,
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
    const t3 = new GetAppSettingTask(
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
   * Create a new AppSetting UpdateTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppSetting to update.
   * @param data AppSetting (partial) object with property `data` - the only property that can be updated.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns UpdateAppSettingTask
   */
  createUpdateTask(
    actor: Actor,
    appDataId: string,
    data: Partial<AppSetting>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): UpdateAppSettingTask {
    return new UpdateAppSettingTask(
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
   * Create a new AppSetting DeleteTask
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppSetting to delete.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppSettingTask
   */
  createDeleteTask(
    actor: Actor,
    appDataId: string,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): DeleteAppSettingTask {
    return new DeleteAppSettingTask(
      actor,
      appDataId,
      itemId,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
    );
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
