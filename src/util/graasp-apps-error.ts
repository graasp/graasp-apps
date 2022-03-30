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

export class AppSettingNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR009', statusCode: 404, message: 'App setting not found' }, data);
  }
}

export class MemberCannotAdminSetting extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR010', statusCode: 400, message: 'Member cannot admin setting' }, data);
  }
}

export class CannotUpdateAppDataFile extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR0011', statusCode: 400, message: 'Cannot update file app data' }, data);
  }
}

export class CannotUpdateAppSettingFile extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR0012', statusCode: 400, message: 'Cannot update file app setting' }, data);
  }
}

export class FileServiceNotDefined extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR0013', statusCode: 500, message: 'File service or type is not defined' },
      data,
    );
  }
}
