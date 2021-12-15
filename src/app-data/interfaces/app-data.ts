import { Anything } from 'graasp';
import { RecordVisibility } from '../../interfaces/app-details';

export interface InputAppData {
  data: { [key: string]: Anything };
  type: string;
  visibility: RecordVisibility;
}

export interface AppData extends InputAppData {
  id: string;
  memberId: string;
  itemId: string;
  creator: string;
  createdAt: string;
  updatedAt: string;
  type: string;
}
