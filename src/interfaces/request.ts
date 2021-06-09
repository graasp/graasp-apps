import { AppDataVisibility } from './app-data';
import { AppIdentification } from './app-details';

export type AuthTokenSubject =
  { member: string, item: string, origin: string } & // from the graasp client/app wrapper
  AppIdentification; // from the app itself


export interface SingleItemGetFilter {
  memberId?: string;
  visibility?: AppDataVisibility;
}

export interface ManyItemsGetFilter extends SingleItemGetFilter {
  itemId: string[];
}