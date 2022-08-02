import {
  Actor,
  AuthTokenSubject,
  FileItemExtra,
  FileItemType,
  Item,
  ItemMembershipService,
  ItemMembershipTaskManager,
  ItemService,
  ItemTaskManager,
  PermissionLevel,
  Task,
} from '@graasp/sdk';
import { FileTaskManager } from 'graasp-plugin-file';

import { FileServiceNotDefined } from '../util/graasp-apps-error';
import { AppSettingService } from './db-service';
import { AppSetting } from './interfaces/app-setting';
import { CreateAppSettingTask } from './tasks/create-app-setting-task';
import { DeleteAppSettingTask } from './tasks/delete-app-setting-task';
import { GetAppSettingTask } from './tasks/get-app-setting-task';
import { GetFileDataInputType, GetFileDataTask } from './tasks/get-file-data-task';
import { UpdateAppSettingTask } from './tasks/update-app-setting-task';

export class TaskManager {
  private appDataService: AppSettingService;
  private itemService: ItemService;
  private itemMembershipService: ItemMembershipService;
  private itemTaskManager: ItemTaskManager;
  private itemMembershipTaskManager: ItemMembershipTaskManager;
  private fileItemType?: FileItemType;
  private fileTaskManager?: FileTaskManager;

  constructor(
    appDataService: AppSettingService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
    itemTaskManager: ItemTaskManager,
    itemMembershipTaskManager: ItemMembershipTaskManager,
    fileItemType?: FileItemType,
    fileTaskManager?: FileTaskManager,
  ) {
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
    this.itemTaskManager = itemTaskManager;
    this.itemMembershipTaskManager = itemMembershipTaskManager;
    this.fileItemType = fileItemType;
    this.fileTaskManager = fileTaskManager;
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
      validatePermission: PermissionLevel.Admin,
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
  createGetTask(actor: Actor, itemId: string, requestDetails: AuthTokenSubject): GetAppSettingTask {
    return new GetAppSettingTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { itemId, requestDetails },
    );
  }

  /**
   * Create a new AppSetting Get Task Sequence
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns Task[]
   */
  createGetTaskSequence(
    actor: Actor,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    const t1 = this.itemTaskManager.createGetTask(actor, itemId);
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1.result,
      validatePermission: PermissionLevel.Read,
    });

    // get app settings
    const t3 = new GetAppSettingTask(
      actor,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      { itemId, requestDetails },
    );
    return [t1, t2, t3];
  }

  /**
   * Create a new AppSetting Update Task Sequence
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppSetting to update.
   * @param data AppSetting (partial) object with property `data` - the only property that can be updated.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns UpdateAppSettingTask
   */
  createUpdateTaskSequence(
    actor: Actor,
    appDataId: string,
    data: Partial<AppSetting>,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    if (!this.fileTaskManager || !this.fileItemType) {
      throw new FileServiceNotDefined({
        fileTaskManager: this.fileTaskManager,
        fileItemType: this.fileItemType,
      });
    }

    const t1 = this.itemTaskManager.createGetTask(actor, itemId);
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1.result,
      validatePermission: PermissionLevel.Admin,
    });
    const updateTask = new UpdateAppSettingTask(
      actor,
      appDataId,
      data,
      itemId,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
      this.fileItemType,
    );
    return [t1, t2, updateTask];
  }

  /**
   * Create a new AppSetting Delete Task Sequence
   * @param actor Object containing an id matching the member that made the request - a copy of `requestDetails.member`.
   * @param appDataId Id of AppSetting to delete.
   * @param itemId Id of item (app item) to which the new AppSetting will be bond to.
   * @param requestDetails All the metadata contained in the jwt auth token.
   * @returns DeleteAppSettingTask
   */
  createDeleteTaskSequence(
    actor: Actor,
    appDataId: string,
    itemId: string,
    requestDetails: AuthTokenSubject,
  ): Task<Actor, unknown>[] {
    if (!this.fileTaskManager || !this.fileItemType) {
      throw new FileServiceNotDefined({
        fileTaskManager: this.fileTaskManager,
        fileItemType: this.fileItemType,
      });
    }

    const t1 = this.itemTaskManager.createGetTask(actor, itemId);
    const t2 = this.itemMembershipTaskManager.createGetMemberItemMembershipTask(actor);
    t2.getInput = () => ({
      item: t1.result,
      validatePermission: PermissionLevel.Admin,
    });
    const deleteTask = new DeleteAppSettingTask(
      actor,
      appDataId,
      itemId,
      requestDetails,
      this.appDataService,
      this.itemService,
      this.itemMembershipService,
    );

    // delete related file if type is file
    const deleteFileTask = this.fileTaskManager.createDeleteFileTask(actor, { filepath: null });
    deleteFileTask.getInput = () => {
      const fileData = deleteTask.result.data as Partial<Item>;
      if (fileData?.type !== this.fileItemType) {
        deleteFileTask.skip = true;
        return {};
      } else {
        const fileDataExtra = fileData?.extra?.[this.fileItemType] as FileItemExtra;
        return {
          filepath: fileDataExtra?.path,
        };
      }
    };
    deleteFileTask.getResult = () => deleteTask.result;

    return [t1, t2, deleteTask, deleteFileTask];
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
