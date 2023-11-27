import { ISOLang } from '@glosuite/shared';
import { ExtraMiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { TransfertStatus } from 'src/domain/enums/flows';
import { PurchaseOrderType } from 'src/domain/enums/purchases';
import {
  InputAmountOutput,
  OutputAmountOutput,
  StockValueModel,
  TotalPurchase,
  TotalTransfert,
} from 'src/domain/interfaces/analytics';

export class GetWarehouseResumeOutput {
  constructor(
    productItems: number,
    stockValue: StockValueModel,
    purchases: number,
    totalPurchase: TotalPurchase,
    transfert: number,
    totalTransfert: TotalTransfert,
    outputs: OutputAmountOutput,
    totalOutput: number,
    inputs: InputAmountOutput,
    lang: ISOLang,
    storagePoint?: StoragePoint,
    startDate?: Date,
    endDate?: Date,
    specificDate?: Date,
    type?: PurchaseOrderType,
    transfertStatus?: TransfertStatus,
  ) {
    this.storagePoint = storagePoint
      ? new ExtraMiniStoragePointOutput(storagePoint)
      : null;
    this.startDate = startDate ? startDate : null;
    this.endDate = endDate ? endDate : null;
    this.specificDate = specificDate ? specificDate : null;
    this.type = type ? type : null;
    this.transfertStatus = transfertStatus ? transfertStatus : null;
    this.productItems = productItems;
    this.stockValue = stockValue;
    this.purchases = purchases;
    this.totalPurchase = totalPurchase;
    this.transfert = transfert;
    this.totalTransfert = totalTransfert;
    this.outputs = outputs;
    this.totalOutput = totalOutput;
    this.inputs = inputs;
  }

  storagePoint?: ExtraMiniStoragePointOutput;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
  type?: PurchaseOrderType;
  transfertStatus?: TransfertStatus;
  productItems: number;
  stockValue: StockValueModel;
  purchases: number;
  totalPurchase: TotalPurchase;
  transfert: number;
  totalTransfert: TotalTransfert;
  outputs: OutputAmountOutput;
  totalOutput: number;
  inputs: InputAmountOutput;
}
