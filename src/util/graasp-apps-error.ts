import { BaseGraaspError } from '@graasp/sdk';

import { PLUGIN_NAME } from './constants';

export class ItemNotFound extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR001', statusCode: 404, message: 'Item not found' }, data);
  }
}

export class NotAnAppItem extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      { code: 'GAERR002', statusCode: 400, message: 'Targeted item is not an application item' },
      data,
    );
  }
}

export class InvalidApplicationOrigin extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR003', statusCode: 403, message: 'Invalid application, origin pair' }, data);
  }
}

export class MemberCannotReadItem extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR004', statusCode: 403, message: 'Member cannot read item' }, data);
  }
}

export class TokenItemIdMismatch extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      { code: 'GAERR005', statusCode: 401, message: 'Auth token does not match targeted item' },
      data,
    );
  }
}

export class AppDataNotFound extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR006', statusCode: 404, message: 'App data not found' }, data);
  }
}

export class AppDataNotAccessible extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      { code: 'GAERR007', statusCode: 403, message: 'Member cannot request this app data' },
      data,
    );
  }
}

export class AppActionNotAccessible extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      { code: 'GAERR008', statusCode: 403, message: 'Member cannot request this app action' },
      data,
    );
  }
}

export class AppSettingNotFound extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR009', statusCode: 404, message: 'App setting not found' }, data);
  }
}

export class MemberCannotAdminSetting extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR010', statusCode: 400, message: 'Member cannot admin setting' }, data);
  }
}

export class CannotUpdateAppDataFile extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR0011', statusCode: 403, message: 'Cannot update file app data' }, data);
  }
}

export class CannotUpdateAppSettingFile extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super({ code: 'GAERR0012', statusCode: 403, message: 'Cannot update file app setting' }, data);
  }
}

export class FileServiceNotDefined extends BaseGraaspError {
  origin = PLUGIN_NAME;
  constructor(data?: unknown) {
    super(
      { code: 'GAERR0013', statusCode: 500, message: 'File service or type is not defined' },
      data,
    );
  }
}
