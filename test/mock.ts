import util from 'util';

import { AuthTokenSubject, Item, ItemMembership } from '@graasp/sdk';
import { FileTaskManager } from 'graasp-plugin-file';
import { ItemMembershipTaskManager, ItemTaskManager, Task, TaskRunner } from 'graasp-test';

export const mockCreateGetTaskSequence = (
  data: Partial<Item> | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockCreateTask = jest
    .spyOn(ItemTaskManager.prototype, 'createGetTaskSequence')
    .mockImplementation(() => {
      return [new Task(data)];
    });
  jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => data);
  return mockCreateTask;
};
export const mockCreateGetTask = (
  data: Partial<Item> | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockCreateTask = jest
    .spyOn(ItemTaskManager.prototype, 'createGetTask')
    .mockImplementation(() => {
      return new Task<Item>(data);
    });
  jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => data);
  return mockCreateTask;
};
export const mockCreateUpdateTaskSequence = (
  data?: Partial<Item> | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockTask = jest
    .spyOn(ItemTaskManager.prototype, 'createUpdateTaskSequence')
    .mockImplementation(() => {
      return [new Task(data)];
    });
  jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => data);
  return mockTask;
};

export const mockCreateCopyFileTask = (
  data?: unknown | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockTask = jest
    .spyOn(FileTaskManager.prototype, 'createCopyFileTask')
    .mockImplementation(() => {
      return new Task(data);
    });
  jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => data);
  return mockTask;
};

export const mockCreateGetMemberItemMembershipTask = (
  data?: Partial<ItemMembership> | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  const mockTask = jest
    .spyOn(ItemMembershipTaskManager.prototype, 'createGetMemberItemMembershipTask')
    .mockImplementation(() => {
      return new Task<ItemMembership>(data);
    });
  jest.spyOn(TaskRunner.prototype, 'runSingle').mockImplementation(async () => data);
  return mockTask;
};

export const mockRunSingleSequence = (
  data?: any | Error,
  shouldThrow?: boolean,
): jest.SpyInstance => {
  return jest.spyOn(TaskRunner.prototype, 'runSingleSequence').mockImplementation(async () => data);
};

export const mockRunSingle = (data: unknown | Error, shouldThrow?: boolean): jest.SpyInstance => {
  return jest.spyOn(TaskRunner.prototype, 'runSingle').mockImplementation(async () => {
    return data;
  });
};

export const mockPromisify = (sub?: AuthTokenSubject) => {
  // mock promisifiedJwtVerify to pass
  jest.spyOn(util, 'promisify').mockImplementation((f) => async () => {
    if (!sub) {
      throw new Error();
    }

    return { sub };
  });
};
