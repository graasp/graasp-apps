import { GraaspErrorDetails, GraaspError } from 'graasp';

export class GraaspAppsError implements GraaspError {
  name: string;
  code: string;
  message: string;
  statusCode?: number;
  data?: unknown;
  origin: 'core' | 'plugin';

  constructor({ code, statusCode, message }: GraaspErrorDetails, data?: unknown) {
    this.name = code;
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.origin = 'plugin';
  }
}

export class ItemNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR001', statusCode: 404, message: 'Item not found' }, data);
  }
}

export class NotAnAppItem extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR002', statusCode: 400, message: 'Targeted item is not an application item' },
      data,
    );
  }
}

export class InvalidApplicationOrigin extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR003', statusCode: 403, message: 'Invalid application, origin pair' }, data);
  }
}

export class MemberCannotReadItem extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR004', statusCode: 403, message: 'Member cannot read item' }, data);
  }
}

export class TokenItemIdMismatch extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR005', statusCode: 401, message: 'Auth token does not match targeted item' },
      data,
    );
  }
}

export class AppDataNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR006', statusCode: 404, message: 'App data not found' }, data);
  }
}

export class AppDataNotAccessible extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR007', statusCode: 403, message: 'Member cannot request this app data' },
      data,
    );
  }
}

export class AppActionNotAccessible extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR008', statusCode: 403, message: 'Member cannot request this app action' },
      data,
    );
  }
}
