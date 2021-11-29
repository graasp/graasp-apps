// global
import { Actor, DatabaseTransactionHandler, ItemMembershipService, ItemService } from 'graasp';
// local
import { AppDataService } from '../db-service';
import { BaseAppDataTask } from './base-app-data-task';
import { AuthTokenSubject } from '../../interfaces/request';
import { AppDataNotAccessible, ItemNotFound, MemberCannotReadItem } from '../../util/graasp-apps-error';
import { LocalFileItemExtra, S3FileItemExtra } from 'graasp-plugin-file';


export type GetFileDataInputType = {
  appDataId?: string;
  enableS3?: boolean;
};

export class GetFileDataTask extends BaseAppDataTask<{filepath: string, mimetype: string}> {
  get name(): string { return GetFileDataTask.name; }
  private requestDetails: AuthTokenSubject;

  public input: GetFileDataInputType;

  /**
   * GetAppDataTask constructor
   * @param actor Actor
   * @param itemId Id of Item to which all the AppDatas belong
   * @param requestDetails Information contained in the auth token
   */
  constructor(actor: Actor, input: GetFileDataInputType,
    requestDetails: AuthTokenSubject, appDataService: AppDataService,
    itemService: ItemService, itemMembershipService: ItemMembershipService) {
    super(actor, appDataService, itemService, itemMembershipService);

    this.requestDetails = requestDetails;
    this.input = input;
  }

  async run(handler: DatabaseTransactionHandler): Promise<void> {
    this.status = 'RUNNING';

    const { appDataId, enableS3 } = this.input;
    const { id: memberId } = this.actor;
    const { item: tokenItemId } = this.requestDetails;

    const appData = await this.appDataService.getForId(appDataId, handler);

    this.checkTargetItemAndTokenItemMatch(appData.itemId, tokenItemId);

    // check if appId matches origin (?) - is this really necessary?; because when the token was generated it was true.
    // atmost the token can be valid until its expiration, even if the app/origin are no londer valid (removed from db)

    // get item (token might still be valid but item no longer exists)
    const item = await this.itemService.get(appData.itemId, handler);
    if (!item) throw new ItemNotFound(appData.itemId);

    // get member's permission over item
    const permission = await this.itemMembershipService.getPermissionLevel(memberId, item, handler);
    if (!permission) throw new MemberCannotReadItem(appData.itemId);

    if (permission !== 'admin') {
      // members are only allowed to download their items
      if(appData.memberId !== memberId && appData.visibility === 'member'){
        throw new AppDataNotAccessible();
      }
    }

    const getFileExtra = (
      extra: LocalFileItemExtra | S3FileItemExtra
    ): {
      name: string;
      path: string;
      size: string;
      mimetype: string;
    } => {
      if(enableS3)
          return (extra as S3FileItemExtra).s3File;
        else
          return (extra as LocalFileItemExtra).file;
    };

    const extra = getFileExtra(appData.data.extra as LocalFileItemExtra);

    this.status = 'OK';
    this._result = {
      filepath: extra.path,
      mimetype: extra.mimetype
    };
  }
}
