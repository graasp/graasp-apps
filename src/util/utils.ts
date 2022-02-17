import { TokenItemIdMismatch } from './graasp-apps-error';

export const checkTargetItemAndTokenItemMatch = (itemId1: string, itemId2: string): void => {
  if (itemId1 !== itemId2) {
    throw new TokenItemIdMismatch();
  }
};
