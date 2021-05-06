import { GraaspErrorDetails, GraaspError } from 'graasp';

export class GraaspAppDataError implements GraaspError {
  name: string;
  code: string
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

export class ItemNotFound extends GraaspAppDataError {
  constructor(data?: unknown) {
    super({ code: 'GADERR001', statusCode: 404, message: 'Item not found' }, data);
  }
}

export class NotAnAppItem extends GraaspAppDataError {
  constructor(data?: unknown) {
    super({ code: 'GADERR002', statusCode: 400, message: 'Targeted item is not an application item' }, data);
  }
}

export class InvalidApplicationOrigin extends GraaspAppDataError {
  constructor(data?: unknown) {
    super({ code: 'GADERR003', statusCode: 403, message: 'Invalid application, origin pair' }, data);
  }
}

export class MemberCannotReadItem extends GraaspAppDataError {
  constructor(data?: unknown) {
    super({ code: 'GADERR004', statusCode: 403, message: 'Member cannot read item' }, data);
  }
}

export class TokenItemIdMismatch extends GraaspAppDataError {
  constructor(data?: unknown) {
    super({ code: 'GADERR005', statusCode: 401, message: 'Auth token does not match targeted item' }, data);
  }
}
