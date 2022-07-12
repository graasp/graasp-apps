import { RecordVisibility } from './app-details';

export interface SingleItemGetFilter {
  memberId?: string;
  visibility?: RecordVisibility;
}

export interface ManyItemsGetFilter extends SingleItemGetFilter {
  itemId: string[];
}
