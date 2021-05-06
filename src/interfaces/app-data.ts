import { Anything } from 'graasp';

export interface AppData {
  id: string;
  memberId: string;
  itemId: string;
  data: { [key: string]: Anything };
  type: string;
  ownership: 'member' | 'item' | 'app' | 'publisher';
  visibility: 'member' | 'item' | 'app' | 'publisher';
  // appId: string;
  // publisherId: string;
  createdAt: string;
  updatedAt: string;
}
