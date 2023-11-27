import { OtherOutput } from 'src/domain/entities/flows';
import { OutputStatus, OutputType } from 'src/domain/enums/flows';
import { MiniUserOutput } from '../auth';
import { ExtraMiniStoragePointOutput } from '../warehouses';

export class MiniOtherOutputOutput {
  constructor(otherOutput: OtherOutput) {
    this.id = otherOutput.id;
    this.reference = otherOutput.reference;
    this.outputType = otherOutput.outputType;
    this.status = otherOutput.status;
    // this.magentoOrderID = otherOutput.magentoOrderID
    //   ? otherOutput.magentoOrderID
    //   : null;
    this.storagePoint = otherOutput.storagePoint
      ? new ExtraMiniStoragePointOutput(otherOutput.storagePoint)
      : null;
    // this.comments = otherOutput.commnets
    //   ? otherOutput.commnets.map((comment) => new CommentItemOutput(comment))
    //   : [];
    this.createdAt = otherOutput.createdAt;
    this.createdBy = otherOutput.createdBy
      ? new MiniUserOutput(otherOutput.createdBy)
      : null;
    this.confirmedAt = otherOutput.confirmedAt ? otherOutput.confirmedAt : null;
    this.confirmedBy = otherOutput.confirmedBy
      ? new MiniUserOutput(otherOutput.confirmedBy)
      : null;
    this.validatedAt = otherOutput.validatedAt ? otherOutput.validatedAt : null;
    this.validatedBy = otherOutput.validatedBy
      ? new MiniUserOutput(otherOutput.validatedBy)
      : null;
  }

  id: string;
  reference: string;
  outputType: OutputType;
  status: OutputStatus;
  // magentoOrderID?: string;
  storagePoint?: ExtraMiniStoragePointOutput;
  // comments?: CommentItemOutput[];
  createdAt: Date;
  createdBy?: MiniUserOutput;
  confirmedAt?: Date;
  confirmedBy?: MiniUserOutput;
  validatedAt?: Date;
  validatedBy?: MiniUserOutput;
}
