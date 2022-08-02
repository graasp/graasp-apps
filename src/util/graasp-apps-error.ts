import { StatusCodes } from 'http-status-codes';

import { ErrorFactory } from '@graasp/sdk';

import { PLUGIN_NAME } from './constants';

export const GraaspAppsError = ErrorFactory(PLUGIN_NAME);

export class ItemNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super({ code: 'GAERR001', statusCode: StatusCodes.NOT_FOUND, message: 'Item not found' }, data);
  }
}

export class NotAnAppItem extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR002',
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Targeted item is not an application item',
      },
      data,
    );
  }
}

export class InvalidApplicationOrigin extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR003',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Invalid application, origin pair',
      },
      data,
    );
  }
}

export class MemberCannotReadItem extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR004', statusCode: StatusCodes.FORBIDDEN, message: 'Member cannot read item' },
      data,
    );
  }
}

export class TokenItemIdMismatch extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR005',
        statusCode: StatusCodes.UNAUTHORIZED,
        message: 'Auth token does not match targeted item',
      },
      data,
    );
  }
}

export class AppDataNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR006', statusCode: StatusCodes.NOT_FOUND, message: 'App data not found' },
      data,
    );
  }
}

export class AppDataNotAccessible extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR007',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Member cannot request this app data',
      },
      data,
    );
  }
}

export class AppActionNotAccessible extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR008',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Member cannot request this app action',
      },
      data,
    );
  }
}

export class AppSettingNotFound extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      { code: 'GAERR009', statusCode: StatusCodes.NOT_FOUND, message: 'App setting not found' },
      data,
    );
  }
}

export class MemberCannotAdminSetting extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR010',
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Member cannot admin setting',
      },
      data,
    );
  }
}

export class CannotUpdateAppDataFile extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR0011',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Cannot update file app data',
      },
      data,
    );
  }
}

export class CannotUpdateAppSettingFile extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR0012',
        statusCode: StatusCodes.FORBIDDEN,
        message: 'Cannot update file app setting',
      },
      data,
    );
  }
}

export class FileServiceNotDefined extends GraaspAppsError {
  constructor(data?: unknown) {
    super(
      {
        code: 'GAERR0013',
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'File service or type is not defined',
      },
      data,
    );
  }
}
