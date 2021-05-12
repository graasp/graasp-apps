import { Anything, UnknownExtra } from 'graasp';

export const APP_ITEM_TYPE = 'app';

export interface AppItemExtra extends UnknownExtra {
  app: {
    url: string,
    settings: Anything
  }
}
