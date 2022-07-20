import {
  Actor,
  AuthTokenSubject,
  DatabaseTransactionHandler,
  Item,
  ItemMembershipService,
  ItemService,
  Member,
  TaskStatus,
} from '@graasp/sdk';

import { ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';

export class GetContextTask extends BaseAppDataTask<Actor, Partial<Item>> {
  get name(): string {
    return GetContextTask.name;
  }
  private requestDetails: AuthTokenSubject;
  private itemId: string;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(
    actor: Actor,
    itemId: string,
    requestDetails: AuthTokenSubject,
    appDataService: AppDataService,
    itemService: ItemService,
    itemMembershipService: ItemMembershipService,
  ) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.itemId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = TaskStatus.RUNNING;

    if (this.requestDetails) {
      const { item: tokenItemId } = this.requestDetails;
      this.checkTargetItemAndTokenItemMatch(this.itemId, tokenItemId);
    }

    // get item
    const item = await this.itemService.get(this.itemId, handler);
    if (!item) throw new ItemNotFound(this.itemId);

    // get member's permission over item
    const { id: memberId } = this.actor;
    const canRead = await this.itemMembershipService.canRead(memberId, item, handler);
    if (!canRead) throw new MemberCannotReadItem(this.itemId);

    const p1 = this.appDataService.getFoldersAndAppsFromParent(item, handler);
    const p2 = this.appDataService.getItemAndParentMembers(item, handler);

    const [foldersAndAppItems, members] = await Promise.all([p1, p2]);
    const parent: Partial<Item> & { children?: Partial<Item>[]; members?: Partial<Member>[] } =
      foldersAndAppItems.length
        ? this.sortedListToTree(foldersAndAppItems[0], foldersAndAppItems, 1)
        : {};

    parent.members = members;

    this.status = TaskStatus.OK;
    this._result = parent;
  }

  // TODO: doesn't seem the most performant solution
  private sortedListToTree(
    item: Partial<Item> & { children?: Partial<Item>[] },
    items: Partial<Item>[],
    startAt: number,
  ) {
    const { path, type } = item;
    const level = path.split('.').length;

    if (type !== 'folder') return item;

    item.children = [];

    for (let i = startAt; i < items.length; i++) {
      const nextItem = items[i];
      const nextItemLevel = nextItem.path.split('.').length;

      if (nextItemLevel <= level) break;
      if (nextItemLevel > level + 1) continue;

      item.children.push(this.sortedListToTree(nextItem, items, i + 1));
    }

    return item;
  }
}
