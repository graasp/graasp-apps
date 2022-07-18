import { DatabaseTransactionConnection as TrxHandler, sql } from 'slonik';

import { Item, Member } from 'graasp';

import { RecordVisibility } from '../interfaces/app-details';
import { AppData } from './interfaces/app-data';

/**
 * Database's first layer of abstraction for App Data and (exceptionally) for App, Publisher
 */
export class AppDataService {
  // the 'safe' way to dynamically generate the columns names:
  private static allColumns = sql.join(
    [
      'id',
      ['member_id', 'memberId'],
      ['item_id', 'itemId'],
      'data',
      'type',
      'visibility',
      'creator',
      ['created_at', 'createdAt'],
      ['updated_at', 'updatedAt'],
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
      [['app_data', 'id'], ['id']],
      [['app_data', 'member_id'], ['memberId']],
      [['app_data', 'item_id'], ['itemId']],
      [['app_data', 'data'], ['data']],
      [['app_data', 'type'], ['type']],
      [['app_data', 'visibility'], ['visibility']],
      [['app_data', 'creator'], ['creator']],
      [['app_data', 'created_at'], ['createdAt']],
      [['app_data', 'updated_at'], ['updatedAt']],
    ].map((c) =>
      sql.join(
        c.map((cwa) => sql.identifier(cwa)),
        sql` AS `,
      ),
    ),
    sql`, `,
  );

  private objectPropertiesToDBColumnsMapping = (k: keyof AppData) => {
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
   * Create AppData.
   * @param appData Partial AppData
   * @param transactionHandler Database transaction handler
   */
  async create(appData: Partial<AppData>, transactionHandler: TrxHandler): Promise<AppData> {
    // dynamically build a [{column1, value1}, ...] based on properties present in the Partial obj
    const columnsAndValues = Object.keys(appData).map((key: keyof AppData) => {
      const column = sql.identifier([this.objectPropertiesToDBColumnsMapping(key)]);
      const value = key !== 'data' ? sql`${appData[key]}` : sql.json(appData[key]);
      return { column, value };
    });

    const columns = columnsAndValues.map(({ column: c }) => c);
    const values = columnsAndValues.map(({ value: v }) => v);

    return transactionHandler
      .query<AppData>(
        sql`
        INSERT INTO app_data (${sql.join(columns, sql`, `)})
        VALUES (${sql.join(values, sql`, `)})
        RETURNING ${AppDataService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0]);
  }

  /**
   * Update AppData.
   * @param id AppData id
   * @param data Partial AppData (only property `data` is considered)
   * @param transactionHandler Database transaction handler
   * @param memberId Id of member to whom the AppData should be linked to
   */
  async update(
    id: string,
    { data }: Partial<AppData>,
    transactionHandler: TrxHandler,
    memberId?: string,
  ): Promise<AppData> {
    return transactionHandler
      .query<AppData>(
        sql`
        UPDATE app_data
        SET data = ${sql.json(data)}
        WHERE id = ${id}
          ${memberId ? sql`AND member_id = ${memberId}` : sql``}
        RETURNING ${AppDataService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Delete AppData.
   * @param id AppData id
   * @param transactionHandler Database transaction handler
   * @param memberId Id of member to whom the AppData should be linked to
   */
  async delete(id: string, transactionHandler: TrxHandler, memberId?: string): Promise<AppData> {
    return transactionHandler
      .query<AppData>(
        sql`
        DELETE FROM app_data
        WHERE id = ${id}
          ${memberId ? sql`AND member_id = ${memberId}` : sql``}
        RETURNING ${AppDataService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Get item's app data.
   * @param itemId Item id
   * @param filter Filter. `op` default to `AND`
   * @param transactionHandler Database transaction handler
   */
  async getForItem(
    itemId: string,
    filter: { memberId?: string; visibility?: RecordVisibility; op?: 'AND' | 'OR' },
    transactionHandler: TrxHandler,
  ): Promise<readonly AppData[]> {
    const { memberId, visibility, op = 'AND' } = filter;

    let whereStatement = sql`item_id = ${itemId}`;

    if (memberId || visibility) {
      const filterStatement = [];
      const sqlOp = op === 'OR' ? sql` OR ` : sql` AND `;

      if (memberId) filterStatement.push(sql`member_id = ${memberId}`);
      if (visibility) filterStatement.push(sql`visibility = ${visibility}`);

      whereStatement = sql`${whereStatement} AND (${sql.join(filterStatement, sqlOp)})`;
    }

    return transactionHandler
      .query<AppData>(
        sql`
        SELECT ${AppDataService.allColumns} FROM app_data
        WHERE ${whereStatement}
      `,
      )
      .then(({ rows }) => rows);
  }

  /**
   * Get AppData of the items w/ `itemIds` if they have the `item`'s parent as ancestor, i.e.,
   * from items (w/ `itemIds`) in the `item`'s parent subtree.
   * @param itemIds Ids of `item`'s siblings (or descendents of those siblings)
   * @param item Item whose parent is also an ancestor of the items w/ `itemIds`
   * @param filter Filter
   * @param transactionHandler Database transaction handler
   */
  async getForItems(
    itemIds: string[],
    item: Item,
    filter: { memberId?: string; visibility?: RecordVisibility; op?: 'AND' | 'OR' },
    transactionHandler: TrxHandler,
  ): Promise<readonly AppData[]> {
    const { memberId, visibility, op = 'AND' } = filter;

    let filterStatement = sql``;

    if (memberId || visibility) {
      const filters = [];
      const sqlOp = op === 'OR' ? sql` OR ` : sql` AND `;

      if (memberId) filters.push(sql`member_id = ${memberId}`);
      if (visibility) filters.push(sql`visibility = ${visibility}`);

      filterStatement = sql`AND (${sql.join(filters, sqlOp)})`;
    }

    return transactionHandler
      .query<AppData>(
        sql`
        SELECT ${AppDataService.allColumnsForJoins}
          FROM app_data
        INNER JOIN item
          ON app_data.item_id = item.id
        WHERE app_data.item_id IN (${sql.join(itemIds, sql`, `)})
          ${filterStatement}
          AND subpath(${item.path}, 0, -1) @> item.path
      `,
      )
      .then(({ rows }) => rows);
  }

  /**
   * Get folder and app items in `item`'s parent subtree sorted by (ascending) item path
   * @param item Item
   * @param transactionHandler Database transaction handler
   */
  async getFoldersAndAppsFromParent(
    item: Item,
    transactionHandler: TrxHandler,
  ): Promise<Partial<Item>[]> {
    const { path: itemPath } = item;

    if (!itemPath.includes('.')) return [];

    return transactionHandler
      .query<Partial<Item>>(
        sql`
        SELECT id, name, path, description, type, extra
          FROM item
        WHERE subpath(${itemPath}, 0, -1) @> path
          AND type IN ('folder', 'app')
        ORDER BY path ASC
      `,
      )
      .then(({ rows }) => rows.slice(0));
  }

  /**
   * Get info of members who can access the item and
   * the `item`'s parent if it exists
   * @param item Item
   * @param transactionHandler Database transaction handler
   */
  async getItemAndParentMembers(
    item: Item,
    transactionHandler: TrxHandler,
  ): Promise<Partial<Member>[]> {
    const { path: itemPath } = item;

    const parentCondition = itemPath.includes('.')
      ? sql`OR item_membership.item_path @> subpath(${itemPath}, 0, -1)`
      : sql``;

    return transactionHandler
      .query<Partial<Member>>(
        sql`
        SELECT member.id AS id, name, CASE WHEN extra ? 'itemLogin' THEN email ELSE NULL END AS email
          FROM member
        INNER JOIN item_membership
          ON member.id = item_membership.member_id
        WHERE item_membership.item_path = ${itemPath} ${parentCondition}
      `,
      )
      .then(({ rows }) => rows.slice(0));
  }

  // App and Publisher
  async validAppOrigin(
    appId: string,
    appOrigin: string,
    transactionHandler: TrxHandler,
  ): Promise<boolean> {
    return transactionHandler
      .oneFirst<string>(
        sql`
        SELECT count(*)
          FROM app
        INNER JOIN publisher
          ON app.publisher_id = publisher.id
        WHERE app.id = ${appId}
          AND ${appOrigin} = ANY(publisher.origins)
      `,
      )
      .then((count) => parseInt(count, 10) === 1);
  }

  async getAllValidAppOrigins(transactionHandler: TrxHandler): Promise<string[]> {
    return transactionHandler
      .query<string>(
        sql`
        SELECT DISTINCT unnest(origins)
          FROM publisher
      `,
      )
      .then(({ rows }) => rows.slice(0));
  }

  async getById(id: string, transactionHandler: TrxHandler): Promise<AppData> {
    return transactionHandler.one<AppData>(sql`
      SELECT ${AppDataService.allColumnsForJoins}
      FROM app_data
      WHERE id = ${id}
    `);
  }
}
