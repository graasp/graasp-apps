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
  // preHookHandler: PreHookHandlerType<R>;
  // postHookHandler: PostHookHandlerType<R>;

  // requestDetails: RequestDetails;

  constructor(actor: Actor, // requestDetails: RequestDetails,
    // itemService: ItemService, itemMembershipService: ItemMembershipService,
    appDataService: AppDataService, itemService: ItemService, itemMembershipService: ItemMembershipService) {
    this.actor = actor;
    // this.requestDetails = requestDetails;
    this.appDataService = appDataService;
    this.itemService = itemService;
    this.itemMembershipService = itemMembershipService;
    this.status = 'NEW';
  }

  abstract get name(): string;
  get result(): R { return this._result; }
  get message(): string { return this._message; }

  // protected async validateRequest(appData: Partial<AppData>, handler: DatabaseTransactionHandler): Promise<Partial<AppData>> {
  //   const {
  //     member: memberId, item: tokenItemId,
  //     app: appId, origin
  //   } = this.requestDetails;

  //   // TODO: when this.targetId !== tokenItemId it means AppX is trying to create AppData for AppY. Allow or block?

  //   const { ownership: o, visibility: v } = appData;
  //   if (o === 'app' || o === 'publisher' || v === 'app' || v === 'publisher') {
  //     if (!appId || !origin) throw new Error();

  //     // check if there's an app w/ the given `appId` which belongs to a publisher that owns `origin`
  //   }

  //   // get item
  //   const item = await this.itemService.get<AppItemExtra>(this.targetId, handler);
  //   if (!item) throw new ItemNotFound(this.targetId);

  //   // verify membership rights over item
  //   const hasRights = await this.itemMembershipService.canRead(this.actor.id, item, handler);
  //   if (!hasRights) throw new UserCannotReadItem(this.targetId);

  //   const { itemId, data, type, ownership, visibility } = this.data;

  //   return { itemId, data, type, ownership, visibility };
  // }

  abstract run(handler: DatabaseTransactionHandler, log?: FastifyLoggerInstance): Promise<void | BaseAppDataTask<R>[]>;
}
