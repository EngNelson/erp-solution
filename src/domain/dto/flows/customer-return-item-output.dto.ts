import { ISOLang } from '@glosuite/shared';
import { CustomerReturn } from 'src/domain/entities/flows';
import { CustomerReturnStatus } from 'src/domain/enums/flows';
import { MiniUserOutput } from '../auth';
import { ProductItemItemOutput } from '../items';
import { ExtraMiniOrderOutput } from '../orders';
import { ExtraMiniStoragePointOutput } from '../warehouses';
import { MiniReceptionOutput } from './mini-reception-output.dto';
import { MiniStockMovementOutput } from './mini-stock-movement-output.dto';

export class CustomerReturnItemOutput {
  constructor(customerReturn: CustomerReturn, lang: ISOLang) {
    this.id = customerReturn.id;
    this.reference = customerReturn.reference;
    this.status = customerReturn.status;
    this.reception = customerReturn.reception
      ? new MiniReceptionOutput(customerReturn.reception)
      : null;
    this.stockMovements = customerReturn.stockMovements
      ? customerReturn.stockMovements.map(
          (stockMovement) => new MiniStockMovementOutput(stockMovement, lang),
        )
      : [];
    this.order = new ExtraMiniOrderOutput(customerReturn.order);
    this.storagePoint = new ExtraMiniStoragePointOutput(
      customerReturn.storagePoint,
    );
    this.productItems = customerReturn.productItems.map(
      (productItem) => new ProductItemItemOutput(productItem, lang),
    );
    this.createdAt = customerReturn.createdAt;
    this.lastUpdate = customerReturn.lastUpdate
      ? customerReturn.lastUpdate
      : null;
    this.createdBy = new MiniUserOutput(customerReturn.createdBy);
  }

  id: string;
  reference: string;
  status: CustomerReturnStatus;
  order: ExtraMiniOrderOutput;
  storagePoint: ExtraMiniStoragePointOutput;
  productItems: ProductItemItemOutput[];
  stockMovements?: MiniStockMovementOutput[];
  reception?: MiniReceptionOutput;
  createdAt: Date;
  lastUpdate?: Date;
  createdBy: MiniUserOutput;
}
