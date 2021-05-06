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

    // TODO:
    appItemExtra: {
      type: 'object',
      properties: {
        extra: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', format: 'uri', pattern: '^https?:\/\/' },
            settings: {}
          },
          additionalProperties: false
        }
      }
    }
  }
};

const generateToken = {
  params: { $ref: 'http://graasp.org/apps/#/definitions/itemIdParam' }
};

export {
  generateToken
};
