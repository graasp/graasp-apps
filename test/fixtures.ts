import { Actor } from 'graasp';
import { v4 } from 'uuid';

export const GRAASP_ACTOR: Actor = {
  id: 'actorid',
};

export const MOCK_JWT_SECRET = '1234567890123456789012345678901234567890';

export const MOCK_S3_OPTIONS = {
  s3Region: 's3Region',
  s3Bucket: 's3Bucket',
  s3AccessKeyId: 's3AccessKeyId',
  s3SecretAccessKey: 's3SecretAccessKey',
};
export const MOCK_LOCAL_OPTIONS = {
  storageRootPath: '/storageRootPath',
};
export const MOCK_APP_ORIGIN = 'http://app.localhost:3000';
export const buildMockAuthTokenSubject = ({ app = v4(), item = v4() } = {}) => ({
  item,
  member: GRAASP_ACTOR.id,
  app,
  origin: MOCK_APP_ORIGIN,
});
export const MOCK_TOKEN = 'mock-token';
export const MOCK_CONTEXT = {
  id: v4(),
  name: 'some-name',
  path: 'some-path',
  description: 'some-description',
  type: 'some-type',
  extra: {},
  children: [
    {
      id: v4(),
      name: 'some-name',
      path: 'some-path',
      description: 'some-description',
      type: 'some-type',
    },
  ],
  members: [{ id: v4(), name: 'member-name' }],
};
export const MOCK_SETTINGS = {
  showHeader: true,
};
export const MOCK_APPS = [
  { id: v4(), name: 'some-name', url: 'some-url', description: 'description', extra: {} },
];

export const buildAppSetting = ({ name = 'setting-name', data = { setting: 'value' } } = {}) => ({
  id: v4(),
  name,
  data,
});
