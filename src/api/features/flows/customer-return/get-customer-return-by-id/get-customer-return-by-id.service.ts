import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { CustomerReturn, Reception } from 'src/domain/entities/flows';
import {
  CustomerReturnRepository,
  ReceptionRepository,
} from 'src/repositories/flows';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { GetCustomerReturnIdInput } from './dto';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { Supplier } from 'src/domain/entities/purchases';
import { SupplierRepository } from 'src/repositories/purchases';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';

@Injectable()
export class GetCustomerReturnByIdService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
  ) {}

  async getCustomerReturnById(
    input: GetCustomerReturnIdInput,
    user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException('Error during execution', HttpStatus.CREATED);
    }
    return result;
  }

  private async _tryExecution(
    input: GetCustomerReturnIdInput,
    user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const customerReturn = await this._customerReturnRepository.findOne({
        where: {
          id: input.customerReturnId,
        },
        relations: [
          'stockMovements',
          'reception',
          'productItems',
          'storagePoint',
          'order',
        ],
      });

      if (!customerReturn) {
        throw new NotFoundException(
          `Customer Return with id '${input.customerReturnId}' is not found`,
        );
      }

      if (customerReturn.reception) {
        customerReturn.reception = await this._receptionRepository.findOne({
          where: { id: customerReturn.reception.id },
          relations: ['storagePoint', 'child'],
        });
      }

      const productItems: ProductItem[] = [];

      if (
        customerReturn.productItems &&
        customerReturn.productItems.length > 0
      ) {
        for (const productItem of customerReturn.productItems) {
          productItem.location = await this._locationRepository.findOne({
            where: { id: productItem.locationId },
          });

          productItem.supplier = await this._supplierRepository.findOne({
            where: { id: productItem.supplierId },
            relations: ['address'],
          });

          productItem.productVariant =
            await this._productVariantRepository.findOne({
              where: { id: productItem.productVariantId },
            });

          productItems.push(productItem);
        }
      }

      customerReturn.productItems = productItems;

      // console.log('test ==== ', customerReturn.productItems[0].productVariant);

      if (
        customerReturn.stockMovements &&
        customerReturn.stockMovements.length > 0
      ) {
        customerReturn.stockMovements.map(async (stockMovement) => {
          stockMovement.productItem = await this._productItemRepository.findOne(
            {
              where: { id: stockMovement.productItemId },
              relations: ['location', 'supplier'],
            },
          );

          stockMovement.productItem.supplier =
            await this._supplierRepository.findOne({
              where: { id: stockMovement.productItem.supplierId },
              relations: ['address'],
            });

          stockMovement.sourceLocation = await this._locationRepository.findOne(
            { where: { id: stockMovement.sourceLocationId } },
          );

          stockMovement.targetLocation = await this._locationRepository.findOne(
            { where: { id: stockMovement.targetLocationId } },
          );
        });
      }

      return new CustomerReturnItemOutput(customerReturn, lang);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetCustomerReturnByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
