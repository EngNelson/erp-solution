import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class PurchaseOrderReferenceService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(
    purchaseOrder?: PurchaseOrder,
    isChild?: boolean,
  ): Promise<string> {
    try {
      let reference: string;

      if (isChild) {
        reference = `${purchaseOrder.reference}-1`;
      } else {
        const [purchaseOrders, count] =
          await this._purchaseOrderRepository.findAndCount({
            where: { parent: null },
            withDeleted: true,
          });
        const suffix = await this._sharedService.generateSuffix(count + 1, 6);

        reference = `PO${suffix}`;
      }

      return reference;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
