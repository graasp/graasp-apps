import { Anything } from 'graasp';

export interface InputAppSetting {
  data: { [key: string]: Anything };
}

export interface AppSetting extends InputAppSetting {
  id: string;
  name: string;
  itemId: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
