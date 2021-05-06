import { AppIdentification } from './app-details';

export type AuthTokenSubject =
  { member: string, item: string, origin: string } & // from the graasp client/app wrapper
  AppIdentification; // from the app itself
