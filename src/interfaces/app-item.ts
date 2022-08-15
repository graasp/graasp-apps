import { Anything, UnknownExtra } from '@graasp/sdk';

export interface AppItemExtra extends UnknownExtra {
  app: {
    url: string;
    settings: Anything;
  };
}

export interface App {
  id: string;
  name: string;
  url: string;
  description: string;
  extra: Anything;
  key: string;
}
