import { sql, DatabaseTransactionConnectionType as TrxHandler } from 'slonik';

import { App } from './interfaces/app-item';

/**
 * Database's first layer of abstraction for App Action
 */
export class AppService {
  // the 'safe' way to dynamically generate the columns names:
  private static allColumns = sql.join(
    [
      'id',
      'name',
      'description',
      'url',
      'extra',
      ['publisher_id', 'publisherId'],
      ['created_at', 'createdAt']
    ].map(c =>
      !Array.isArray(c) ?
        sql.identifier([c]) :
        sql.join(c.map(cwa => sql.identifier([cwa])), sql` AS `)
    ),
    sql`, `
  );

  /**
   * Get item's app action.
   * @param itemId Item id
   * @param filter Filter
   * @param transactionHandler Database transaction handler
   */
  public async getAppsList(transactionHandler: TrxHandler): Promise<readonly App[]> {
    return transactionHandler.query<App>(sql`SELECT ${AppService.allColumns} FROM app`)
      .then(({ rows }) => rows);
  }
}