import { DatabaseTransactionConnection as TrxHandler, sql } from 'slonik';

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

  /**
   * Get apps by publisher
   * @param itemId Item id
   * @param filter Filter
   * @param transactionHandler Database transaction handler
   */
  public async getAppsListFor(
    publisherId: string,
    transactionHandler: TrxHandler,
  ): Promise<readonly App[]> {
    return transactionHandler
      .query<App>(sql`SELECT ${AppService.allColumns} FROM app WHERE publisher_id = ${publisherId}`)
      .then(({ rows }) => rows);
  }

  public async getAppIdByUrl(url: string, transactionHandler: TrxHandler): Promise<string> {
    return transactionHandler
      .query<string>(
        sql`
        SELECT id
          FROM app
        WHERE url = ${url}
      `,
      )
      .then(({ rows }) => rows[0]);
  }
}
