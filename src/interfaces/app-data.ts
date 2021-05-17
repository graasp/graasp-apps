import { Anything } from 'graasp';

export interface InputAppData {
  data: { [key: string]: Anything };
  type: string;
  ownership: 'member' | 'item' | 'app' | 'publisher';
  visibility: 'member' | 'item' | 'app' | 'publisher';
}

export interface AppData extends InputAppData {
  id: string;
  memberId: string;
  itemId: string;
  createdAt: string;
  updatedAt: string;
}
