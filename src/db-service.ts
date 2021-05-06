// global
import { sql, DatabaseTransactionConnectionType as TrxHandler } from 'slonik';
// local
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
      'ownership',
      // ['app_id', 'appId'],
      // ['publisher_id', 'publisherId'],
      'visibility',
      ['created_at', 'createdAt'],
      ['updated_at', 'updatedAt']
    ].map(c =>
      !Array.isArray(c) ?
        sql.identifier([c]) :
        sql.join(c.map(cwa => sql.identifier([cwa])), sql` AS `)
    ),
    sql`, `
  );

  private objectPropertiesToDBColumnsMapping = (k: keyof AppData) => {
    switch (k) {
      case 'memberId': return 'member_id';
      case 'itemId': return 'item_id';
      // case 'appId': return 'app_id';
      // case 'publisherId': return 'publisher_id';
      default: return k;
    }
  };

  /**
   * Create AppData.
   * @param appData Partial AppData
   * @param transactionHandler Database transaction handler
   */
  async create(appData: Partial<AppData>, transactionHandler: TrxHandler): Promise<AppData> {
    // dynamically build a [{column1, value1}, ...] based on properties present in the Partial obj
    const columnsAndValues = Object.keys(appData)
      .map((key: keyof AppData) => {
        const column = sql.identifier([this.objectPropertiesToDBColumnsMapping(key)]);
        const value = (key !== 'data') ? sql`${appData[key]}` : sql.json(appData[key]);
        return { column, value };
      });

    const columns = columnsAndValues.map(({ column: c }) => c);
    const values = columnsAndValues.map(({ value: v }) => v);

    return transactionHandler
      .query<AppData>(sql`
        INSERT INTO app_data (${sql.join(columns, sql`, `)})
        VALUES (${sql.join(values, sql`, `)})
        RETURNING ${AppDataService.allColumns}
      `)
      .then(({ rows }) => rows[0]);
  }

  /**
   * Update AppData.
   * @param id AppData id
   * @param data Partial AppData (only property `data` is considered) 
   * @param transactionHandler Database transaction handler
   * @param memberId Id of member to whom the AppData should be linked to
   */
  async update(id: string, { data }: Partial<AppData>, transactionHandler: TrxHandler, memberId?: string): Promise<AppData> {
    return transactionHandler
      .query<AppData>(sql`
        UPDATE app_data
        SET data = ${sql.json(data)}
        WHERE id = ${id}
          ${memberId ? sql`AND member_id = ${memberId}` : sql``}
        RETURNING ${AppDataService.allColumns}
      `)
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Delete AppData.
   * @param id AppData id
   * @param transactionHandler Database transaction handler
   * @param memberId Id of member to whom the AppData should be linked to
   */
  async delete(id: string, transactionHandler: TrxHandler, memberId?: string): Promise<AppData> {
    return transactionHandler.query<AppData>(sql`
        DELETE FROM app_data
        WHERE id = ${id}
          ${memberId ? sql`AND member_id = ${memberId}` : sql``}
        RETURNING ${AppDataService.allColumns}
      `)
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Get item's app data.
   * @param itemId Item id
   * @param transactionHandler Database transaction handler
   * @param memberId Id of member to whom the AppDatas should be linked to
   */
  async getAll(itemId: string, transactionHandler: TrxHandler, memberId?: string): Promise<readonly AppData[]> {
    return transactionHandler.query<AppData>(sql`
        SELECT ${AppDataService.allColumns} FROM app_data
        WHERE item_id = ${itemId}
          ${memberId ? sql`AND member_id = ${memberId}` : sql``}
      `)
      .then(({ rows }) => rows);
  }

  // App and Publisher
  async validAppOrigin(appId: string, appOrigin: string, transactionHandler: TrxHandler): Promise<boolean> {
    return transactionHandler
      .oneFirst<string>(sql`
        SELECT count(*)
          FROM app
        INNER JOIN publisher
          ON app.publisher_id = publisher.id
        WHERE app.id = ${appId}
          AND ${appOrigin} = ANY(publisher.origins)
      `)
      .then(count => parseInt(count, 10) === 1);
  }
}
