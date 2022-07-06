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

  constructor(actor: Actor, appService: AppService, publisherId: string) {
    this.appService = appService;
    this.actor = actor;
    this.publisherId = publisherId;
  }

  publisherId: string;
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

    const apps = await this.appService.getAppsListFor(this.publisherId, handler);

    this.status = 'OK';
    this.result = apps;
  }
}
