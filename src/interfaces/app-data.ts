import { Anything } from 'graasp';

export type AppDataVisibility = 'member' | 'item';

export interface InputAppData {
  data: { [key: string]: Anything };
  type: string;
  visibility: AppDataVisibility;
}

export interface AppData extends InputAppData {
  id: string;
  memberId: string;
  itemId: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
