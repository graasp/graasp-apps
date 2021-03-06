export default {
  $id: 'http://graasp.org/apps/app-data/',
  definitions: {
    appData: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        memberId: { type: 'string' },
        itemId: { type: 'string' },
        data: {},
        type: { type: 'string' },
        // ownership: { type: 'string' }, // TODO: should we always return this
        visibility: { type: 'string' }, // TODO: should we always return this
        creator: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  },
};

const create = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  body: {
    type: 'object',
    required: ['data', 'type'],
    properties: {
      data: { type: 'object', additionalProperties: true },
      type: { type: 'string', minLength: 3, maxLength: 25 },
      visibility: { type: 'string', enum: ['member', 'item'] },
      memberId: { $ref: 'http://graasp.org/#/definitions/uuid' },
    },
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/app-data/#/definitions/appData' },
  },
};

const updateOne = {
  params: {
    allOf: [
      { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
      { $ref: 'http://graasp.org/#/definitions/idParam' },
    ],
  },
  body: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'object', additionalProperties: true },
    },
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/app-data/#/definitions/appData' },
  },
};

const deleteOne = {
  params: {
    allOf: [
      { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
      { $ref: 'http://graasp.org/#/definitions/idParam' },
    ],
  },
  response: {
    200: { $ref: 'http://graasp.org/apps/app-data/#/definitions/appData' },
  },
};

const getForOne = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  querystring: {
    type: 'object',
    properties: {
      visibility: { type: 'string', enum: ['member', 'item'] },
      memberId: { $ref: 'http://graasp.org/#/definitions/uuid' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: { $ref: 'http://graasp.org/apps/app-data/#/definitions/appData' },
    },
  },
};

const getForMany = {
  querystring: {
    type: 'object',
    required: ['itemId'],
    properties: {
      itemId: {
        type: 'array',
        items: { $ref: 'http://graasp.org/#/definitions/uuid' },
        uniqueItems: true,
      },
      visibility: { type: 'string', enum: ['member', 'item'] },
      memberId: { $ref: 'http://graasp.org/#/definitions/uuid' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: { $ref: 'http://graasp.org/apps/app-data/#/definitions/appData' },
    },
  },
};

export { create, updateOne, deleteOne, getForOne, getForMany };
