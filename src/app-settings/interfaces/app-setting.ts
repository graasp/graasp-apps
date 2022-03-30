import { Anything } from 'graasp';

export interface InputAppSetting {
  name: string;
  itemId: string;
  data: { [key: string]: Anything };
}

export interface AppSetting extends InputAppSetting {
  id: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
}
