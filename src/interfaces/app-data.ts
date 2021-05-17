import { Anything } from 'graasp';

export type AppDataScope = 'member' | 'item' | 'app' | 'publisher';

export interface InputAppData {
  data: { [key: string]: Anything };
  type: string;
  ownership: AppDataScope;
  visibility: AppDataScope;
}

export interface AppData extends InputAppData {
  id: string;
  memberId: string;
  itemId: string;
  createdAt: string;
  updatedAt: string;
}
