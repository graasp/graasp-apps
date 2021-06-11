import { Anything } from 'graasp';

export interface InputAppAction {
  data: { [key: string]: Anything };
  type: string;
}

export interface AppAction extends InputAppAction {
  id: string;
  memberId: string;
  itemId: string;
  createdAt: string;
}
