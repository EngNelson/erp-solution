import { StoragePointStatus, StoragePointType } from '@glosuite/shared';

export interface StoragePointData {
  storagePointRef: string;
  storageType: StoragePointType;
  name: string;
  status: StoragePointStatus;
}
