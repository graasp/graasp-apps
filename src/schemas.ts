import S from 'fluent-json-schema';

export default {
  $id: 'http://graasp.org/apps/',
  definitions: {
    itemIdParam: {
      type: 'object',
      required: ['itemId'],
      properties: {
        itemId: { $ref: 'http://graasp.org/#/definitions/uuid' }
      }
    },

    appData: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        memberId: { type: 'string' },
        itemId: { type: 'string' },
        data: {},
        type: { type: 'string' },
        ownership: { type: 'string' },
        visibility: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' }
      }
    }
  }
};

const generateToken = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  body: {
    type: 'object',
    required: ['app', 'origin'],
    properties: {
      app: { $ref: 'http://graasp.org/#/definitions/uuid' },
      origin: { type: 'string', format: 'url' }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: { token: { type: 'string' } }
    }
  }
};

const create = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  body: {
    type: 'object',
    required: ['data', 'type'],
    properties: {
      data: { type: 'object', additionalProperties: true },
      type: { type: 'string', minLength: 3, maxLength: 25 },
      visibility: { type: 'string', enum: ['member', 'item', 'app', 'publisher'] },
      ownership: { type: 'string', enum: ['member', 'item', 'app', 'publisher'] }
    }
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/#/definitions/appData' }
  }
};

const updateOne = {
  params: {
    allOf: [
      { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
      { $ref: 'http://graasp.org/#/definitions/idParam' }
    ]
  },
  body: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'object', additionalProperties: true }
    }
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/#/definitions/appData' }
  }
};

const deleteOne = {
  params: {
    allOf: [
      { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
      { $ref: 'http://graasp.org/#/definitions/idParam' }
    ]
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/#/definitions/appData' }
  }
};

const getMany = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  querystring: {
    type: 'object',
    properties: {
      visibility: { type: 'string', enum: ['member', 'item'] }, // 'app', 'publisher'
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: { $ref: 'http://graasp.org/apps/#/definitions/appData' }
    }
  }
};

export {
  generateToken,
  create,
  updateOne,
  deleteOne,
  getMany
};

/**
 * Fluent schema definitions to extend core schemas
 */
export const updateSchema = S.object()
  .prop(
    'app',
    S.object()
      .prop('settings', S.object())
      .required(['settings'])
  )
  .required(['app']);

const extraCreate = S.object()
  // TODO: .additionalProperties(false) in schemas don't seem to work properly and
  // are very counter-intuitive. We should change to JTD format (as soon as it is supported)
  // .additionalProperties(false)
  .prop(
    'app',
    S.object()
      // .additionalProperties(false)
      .prop('url', S.string().format('url'))
      .prop('settings', S.object())
      .required(['url'])
  )
  .required(['app']);

export const createSchema = S.object()
  .prop('type', S.const('app'))
  .prop('extra', extraCreate)
  .required(['type', 'extra']);
