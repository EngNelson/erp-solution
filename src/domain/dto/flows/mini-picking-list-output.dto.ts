import { PickingList } from 'src/domain/entities/flows';
import { OperationStatus, PickingPurpose } from 'src/domain/enums/flows';

export class MiniPickingListOutput {
  constructor(pickingList: PickingList) {
    this.id = pickingList.id;
    this.reference = pickingList.reference;
    this.purpose = pickingList.purpose;
    this.status = pickingList.status;
  }

  id: string;
  reference: string;
  purpose: PickingPurpose;
  status: OperationStatus;
}
