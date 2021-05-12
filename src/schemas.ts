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
      .prop('url', S.string().format('uri'))
      .prop('settings', S.object())
      .required(['url'])
  )
  .required(['app']);

export const createSchema = S.object()
  .prop('type', S.const('app'))
  .prop('extra', extraCreate)
  .required(['type', 'extra']);
