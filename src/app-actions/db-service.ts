import { DatabaseTransactionConnection as TrxHandler, sql } from 'slonik';

import { Item } from '@graasp/sdk';

import { AppAction } from './interfaces/app-action';

/**
 * Database's first layer of abstraction for App Action
 */
export class AppActionService {
  // the 'safe' way to dynamically generate the columns names:
  private static allColumns = sql.join(
    [
      'id',
      ['member_id', 'memberId'],
      ['item_id', 'itemId'],
      'data',
      'type',
      ['created_at', 'createdAt'],
    ].map((c) =>
      !Array.isArray(c)
        ? sql.identifier([c])
        : sql.join(
            c.map((cwa) => sql.identifier([cwa])),
            sql` AS `,
          ),
    ),
    sql`, `,
  );

  private static allColumnsForJoins = sql.join(
    [
      [['app_action', 'id'], ['id']],
      [['app_action', 'member_id'], ['memberId']],
      [['app_action', 'item_id'], ['itemId']],
      [['app_action', 'data'], ['data']],
      [['app_action', 'type'], ['type']],
      [['app_action', 'created_at'], ['createdAt']],
    ].map((c) =>
      sql.join(
        c.map((cwa) => sql.identifier(cwa)),
        sql` AS `,
      ),
    ),
    sql`, `,
  );

  private objectPropertiesToDBColumnsMapping = (k: keyof AppAction) => {
    switch (k) {
      case 'memberId':
        return 'member_id';
      case 'itemId':
        return 'item_id';
      default:
        return k;
    }
  };

  /**
   * Create AppAction.
   * @param appAction Partial AppAction
   * @param transactionHandler Database transaction handler
   */
  async create(appAction: Partial<AppAction>, transactionHandler: TrxHandler): Promise<AppAction> {
    // dynamically build a [{column1, value1}, ...] based on properties present in the Partial obj
    const columnsAndValues = Object.keys(appAction).map((key: keyof AppAction) => {
      const column = sql.identifier([this.objectPropertiesToDBColumnsMapping(key)]);
      const value = key !== 'data' ? sql`${appAction[key]}` : sql.json(appAction[key]);
      return { column, value };
    });

    const columns = columnsAndValues.map(({ column: c }) => c);
    const values = columnsAndValues.map(({ value: v }) => v);

    return transactionHandler
      .query<AppAction>(
        sql`
        INSERT INTO app_action (${sql.join(columns, sql`, `)})
        VALUES (${sql.join(values, sql`, `)})
        RETURNING ${AppActionService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0]);
  }

  /**
   * Get item's app action.
   * @param itemId Item id
   * @param filter Filter
   * @param transactionHandler Database transaction handler
   */
  async getForItem(
    itemId: string,
    filter: { memberId?: string },
    transactionHandler: TrxHandler,
  ): Promise<readonly AppAction[]> {
    const { memberId } = filter;

    let whereStatement = sql`item_id = ${itemId}`;

    if (memberId) {
      whereStatement = sql`${whereStatement} AND (${sql`member_id = ${memberId}`})`;
    }

    return transactionHandler
      .query<AppAction>(
        sql`
        SELECT ${AppActionService.allColumns} FROM app_action
        WHERE ${whereStatement}
      `,
      )
      .then(({ rows }) => rows);
  }

  /**
   * Get AppAction of the items w/ `itemIds` if they have the `item`'s parent as ancestor, i.e.,
   * from items (w/ `itemIds`) in the `item`'s parent subtree.
   * @param itemIds Ids of `item`'s siblings (or descendents of those siblings)
   * @param item Item whose parent is also an ancestor of the items w/ `itemIds`
   * @param filter Filter
   * @param transactionHandler Database transaction handler
   */
  async getForItems(
    itemIds: string[],
    item: Item,
    filter: { memberId?: string },
    transactionHandler: TrxHandler,
  ): Promise<readonly AppAction[]> {
    const { memberId } = filter;

    let filterStatement = sql``;

    if (memberId) {
      filterStatement = sql`AND (${sql`member_id = ${memberId}`})`;
    }

    return transactionHandler
      .query<AppAction>(
        sql`
        SELECT ${AppActionService.allColumnsForJoins}
          FROM app_action
        INNER JOIN item
          ON app_action.item_id = item.id
        WHERE app_action.item_id IN (${sql.join(itemIds, sql`, `)})
          ${filterStatement}
          AND subpath(${item.path}, 0, -1) @> item.path
      `,
      )
      .then(({ rows }) => rows);
  }
}
