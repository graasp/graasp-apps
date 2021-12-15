import { ServiceMethod } from 'graasp-plugin-file';

export interface AppsPluginOptions {
  jwtSecret: string;
  /** In minutes. Defaults to 30 (minutes) */
  jwtExpiration?: number;

  serviceMethod: ServiceMethod;
  thumbnailsPrefix: string;
}
