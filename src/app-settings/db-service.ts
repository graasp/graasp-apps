import { DatabaseTransactionConnection as TrxHandler, sql } from 'slonik';

import { AppSetting } from './interfaces/app-setting';

/**
 * Database's first layer of abstraction for App Settings
 */
export class AppSettingService {
  // the 'safe' way to dynamically generate the columns names:
  private static allColumns = sql.join(
    [
      'id',
      ['item_id', 'itemId'],
      'data',
      'name',
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
      [['app_setting', 'id'], ['id']],
      [['app_setting', 'item_id'], ['itemId']],
      [['app_setting', 'data'], ['data']],
      [['app_setting', 'name'], ['name']],
      [['app_setting', 'creator'], ['creator']],
      [['app_setting', 'created_at'], ['createdAt']],
      [['app_setting', 'updated_at'], ['updatedAt']],
    ].map((c) =>
      sql.join(
        c.map((cwa) => sql.identifier(cwa)),
        sql` AS `,
      ),
    ),
    sql`, `,
  );

  private objectPropertiesToDBColumnsMapping = (k: keyof AppSetting) => {
    switch (k) {
      case 'itemId':
        return 'item_id';
      default:
        return k;
    }
  };

  /**
   * Create AppSetting.
   * @param appData Partial AppSetting
   * @param transactionHandler Database transaction handler
   */
  async create(appData: Partial<AppSetting>, transactionHandler: TrxHandler): Promise<AppSetting> {
    // dynamically build a [{column1, value1}, ...] based on properties present in the Partial obj
    const columnsAndValues = Object.keys(appData).map((key: keyof AppSetting) => {
      const column = sql.identifier([this.objectPropertiesToDBColumnsMapping(key)]);
      const value = key !== 'data' ? sql`${appData[key]}` : sql.json(appData[key]);
      return { column, value };
    });

    const columns = columnsAndValues.map(({ column: c }) => c);
    const values = columnsAndValues.map(({ value: v }) => v);

    return transactionHandler
      .query<AppSetting>(
        sql`
        INSERT INTO app_setting (${sql.join(columns, sql`, `)})
        VALUES (${sql.join(values, sql`, `)})
        RETURNING ${AppSettingService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0]);
  }

  /**
   * Update AppSetting.
   * @param id AppSetting id
   * @param data Partial AppSetting (only property `data` is considered)
   * @param transactionHandler Database transaction handler
   */
  async update(
    id: string,
    { data }: Partial<AppSetting>,
    transactionHandler: TrxHandler,
  ): Promise<AppSetting> {
    const sqlData = sql.json(data);
    return transactionHandler
      .query<AppSetting>(
        sql`
        UPDATE app_setting
        SET data = ${sqlData}
        WHERE id = ${id}
        RETURNING ${AppSettingService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Delete AppSetting.
   * @param id AppSetting id
   * @param transactionHandler Database transaction handler
   */
  async delete(id: string, transactionHandler: TrxHandler): Promise<AppSetting> {
    return transactionHandler
      .query<AppSetting>(
        sql`
        DELETE FROM app_setting
        WHERE id = ${id}
        RETURNING ${AppSettingService.allColumns}
      `,
      )
      .then(({ rows }) => rows[0] || null);
  }

  /**
   * Get item's app setting.
   * @param itemId Item id
   * @param transactionHandler Database transaction handler
   */
  async getForItem(itemId: string, transactionHandler: TrxHandler): Promise<readonly AppSetting[]> {
    const whereStatement = sql`item_id = ${itemId}`;

    return transactionHandler
      .query<AppSetting>(
        sql`
        SELECT ${AppSettingService.allColumns} FROM app_setting
        WHERE ${whereStatement}
      `,
      )
      .then(({ rows }) => rows);
  }

  async getById(id: string, transactionHandler: TrxHandler): Promise<AppSetting> {
    return transactionHandler.one<AppSetting>(sql`
      SELECT ${AppSettingService.allColumnsForJoins}
      FROM app_setting
      WHERE id = ${id}
    `);
  }
}
