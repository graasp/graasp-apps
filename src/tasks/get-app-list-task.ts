// global
import {
  Actor,
  DatabaseTransactionHandler,
  PostHookHandlerType,
  PreHookHandlerType,
  Task,
  TaskStatus,
} from 'graasp';
import { AppService } from '../db-service';
import { App } from '../interfaces/app-item';

export class GetAppListTask implements Task<Actor, readonly App[]> {
  get name(): string {
    return GetAppListTask.name;
  }

  constructor(actor: Actor, appService: AppService) {
    this.appService = appService;
    this.actor = actor;
  }

  actor: Actor;
  targetId?: string;
  data?: readonly App[];
  status: TaskStatus;
  message?: string;
  partialSubtasks?: boolean;
  preHookHandler?: PreHookHandlerType<App[], unknown>;
  postHookHandler?: PostHookHandlerType<App[], unknown>;
  skipActorChecks?: boolean;
  skipTargetChecks?: boolean;
  result: readonly App[];

  appService: AppService;

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const appData = await this.appService.getAppsList(handler);

    this.status = 'OK';
    this.result = appData;
  }
}
