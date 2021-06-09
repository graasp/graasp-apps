// global
import { Actor, DatabaseTransactionHandler, Item, ItemMembershipService, ItemService, Member } from 'graasp';
// local
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../interfaces/request';
import { ItemNotFound, MemberCannotReadItem } from '../util/graasp-app-data-error';

export class GetContextTask extends BaseAppDataTask<Partial<Item>> {
  get name(): string { return GetContextTask.name; }
  private requestDetails: AuthTokenSubject;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, itemId: string, requestDetails: AuthTokenSubject,
    appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.targetId = itemId;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    if (this.requestDetails) {
      const { item: tokenItemId } = this.requestDetails;
      this.checkTargetItemAndTokenItemMatch(tokenItemId);
    }

    const { id: memberId } = this.actor;
    const appItemId = this.targetId;

    // get item
    const item = await this.itemService.get(appItemId, handler);
    if (!item) throw new ItemNotFound(appItemId);

    // get member's permission over item
    const canRead = await this.itemMembershipService.canRead(memberId, item, handler);
    if (!canRead) throw new MemberCannotReadItem(appItemId);

    const p1 = this.appDataService.getFoldersAndAppsFromParent(item, handler);
    const p2 = this.appDataService.getParentItemMembers(item, handler);

    const [foldersAndAppItems, members] = await Promise.all([p1, p2]);
    const parent: Partial<Item> & { children?: Partial<Item>[], members?: Partial<Member>[] } =
      this.sortedListToTree(foldersAndAppItems[0], foldersAndAppItems, 1);
    parent.members = members;

    this.status = 'OK';
    this._result = parent;
  }

  // TODO: doesn't seem the most performant solution
  private sortedListToTree(item: Partial<Item> & { children?: Partial<Item>[] }, items: Partial<Item>[], startAt: number) {
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
