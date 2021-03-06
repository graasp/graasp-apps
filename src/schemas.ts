export default {
  $id: 'http://graasp.org/apps/',
  definitions: {
    itemIdParam: {
      type: 'object',
      required: ['itemId'],
      properties: {
        itemId: { $ref: 'http://graasp.org/#/definitions/uuid' },
      },
    },

    appContext: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        path: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        extra: {},
        children: { type: 'array' },
        members: { type: 'array' },
      },
    },
  },
};

const generateToken = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  body: {
    type: 'object',
    required: ['app', 'origin'],
    properties: {
      app: { $ref: 'http://graasp.org/#/definitions/uuid' },
      origin: { type: 'string', format: 'url' },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: { token: { type: 'string' } },
    },
  },
};

const getContext = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  response: {
    200: { $ref: 'http://graasp.org/apps/#/definitions/appContext' },
  },
};
const patchSettings = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' },
  body: {
    type: 'object',
    additionalProperties: true,
  },
  response: {
    204: {},
  },
};

export { generateToken, getContext, patchSettings };
