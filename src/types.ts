import { ServiceMethod } from 'graasp-plugin-file';

export interface AppsPluginOptions {
  jwtSecret: string;
  /** In minutes. Defaults to 30 (minutes) */
  jwtExpiration?: number;

  serviceMethod: ServiceMethod;
  thumbnailsPrefix: string;
}

// todo: get from plugin-file, currently the enum is defined as integer
// which does not work for string
export type FileServiceType = string;
