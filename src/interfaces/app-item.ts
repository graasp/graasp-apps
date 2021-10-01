import { Anything, UnknownExtra } from 'graasp';
import { url } from 'inspector';

export const APP_ITEM_TYPE = 'app';

export interface AppItemExtra extends UnknownExtra {
  app: {
    url: string,
    settings: Anything
  }
}


export interface App {
  name: string,
  url: string,
  description: string,
  extra:string,
}
