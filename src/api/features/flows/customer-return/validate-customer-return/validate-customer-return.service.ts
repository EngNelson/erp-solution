import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import {
  CustomerReturn,
  Reception,
  StockMovement,
  VariantReception,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';
import { Location } from 'src/domain/entities/warehouses';
import {
  CustomerReturnState,
  MovementType,
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { VariantItemsModel } from 'src/domain/interfaces/i.variant-items.model';
import {
  CustomerReturnRepository,
  ReceptionRepository,
  StockMovementRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { SupplierRepository } from 'src/repositories/purchases';
import { LocationRepository } from 'src/repositories/warehouses';
import {
  StoragePointService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { ReceptionService } from 'src/services/references/flows';
import { ValidateCustomerReturnInput } from './dto';

type ValidationResult = {
  customerReturn: CustomerReturn;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateCustomerReturnService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _storagePointService: StoragePointService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async validateCustomerReturn(
    input: ValidateCustomerReturnInput,
    user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<CustomerReturnItemOutput> {
    try {
      const { customerReturn, lang, user } = result;

      customerReturn.state = CustomerReturnState.VALIDATED;
      customerReturn.validatedAt = new Date();
      customerReturn.validatedBy = user;

      /**
       * Create a new reception
       */
      const reception = new Reception();

      reception.reference =
        await this._receptionReferenceService.generateReference();
      reception.type = ReceptionType.CUSTOMER_RETURN;
      reception.status = OperationStatus.PENDING;

      reception.storagePoint = customerReturn.storagePoint;
      reception.storagePointId = customerReturn.storagePointId;
      reception.customerReturn = customerReturn;
      reception.createdBy = user;

      await this._receptionRepository.save(reception);

      // Get storage-point default sav location
      const defaultSavLocation =
        await this._storagePointService.getOrCreateStoragePointDefaultSavLocation(
          customerReturn.storagePoint,
        );

      const variantsToReceived: VariantItemsModel[] = [];
      const productItemsToEdit: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const variantsToUpdate: ProductVariant[] = [];

      if (customerReturn.productItems.length > 0) {
        for (const productItem of customerReturn.productItems) {
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.IN;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = TriggeredBy.CUSTOMER_RETURN;
          stockMovement.sourceType = StockMovementAreaType.CUSTOMER;
          stockMovement.createdBy = user;
          stockMovement.productItem = productItem;
          stockMovement.productItemId = productItem.id;
          stockMovement.targetLocation = defaultSavLocation;
          stockMovement.targetLocationId = defaultSavLocation.id;
          stockMovement.targetType = StockMovementAreaType.LOCATION;

          stockMovementsToAdd.push(stockMovement);

          // Set each product item state, status and location
          productItem.state = ItemState.PENDING_RECEPTION;
          productItem.status = StepStatus.TO_RECEIVED;
          productItem.location = defaultSavLocation;
          productItem.locationId = defaultSavLocation.id;

          productItemsToEdit.push(productItem);

          // Set products and variants available quantities
          const productVariant = productItem.productVariant;

          const productToUpdate = await this._productRepository.findOneOrFail({
            where: { id: productVariant.productId },
          });

          /**
           * Set product-item  variants to received array
           */
          let variantToReceivedLine = variantsToReceived.find(
            (line) => line.variant.id === productVariant.id,
          );

          if (!variantToReceivedLine) {
            variantToReceivedLine = {
              variant: productVariant,
              quantity: 1,
            };

            variantsToReceived.push(variantToReceivedLine);
          } else {
            variantsToReceived.map((line) => {
              if (line.variant.id === variantToReceivedLine.variant.id) {
                line.quantity += 1;
              }

              return line;
            });
          }

          /**
           * Set product and variant quantities
           */

          //Add
          // Variant
          productVariant.quantity.pendingReception += 1;
          productVariant.quantity.delivered -= 1;

          await this._productVariantRepository.save(productVariant);

          productToUpdate.quantity.pendingReception += 1;
          productToUpdate.quantity.delivered -= 1;

          await this._productRepository.save(productToUpdate);

          if (
            !variantsToUpdate.find(
              (variant) => variant.id === productVariant.id,
            )
          ) {
            variantsToUpdate.push(productVariant);
          }
        }
      }

      await this._productItemRepository.save(productItemsToEdit);
      await this._stockMovementRepository.save(stockMovementsToAdd);

      /**
       * Save variants to received
       */
      const variantsToReceivedToAdd: VariantReception[] = [];

      let position = 0;
      variantsToReceived.map(async (variantToReceived) => {
        const { variant, quantity } = variantToReceived;

        const variantReception = new VariantReception();

        variantReception.productVariant = variant;
        variantReception.variantId = variant.id;
        variantReception.reception = reception;
        variantReception.receptionId = reception.id;
        variantReception.quantity = quantity;
        variantReception.position = position;
        variantReception.state = OperationLineState.PENDING;
        variantReception.createdBy = user;

        variantsToReceivedToAdd.push(variantReception);

        position++;
      });

      await this._variantReceptionRepository.save(variantsToReceivedToAdd);

      reception.variantReceptions = variantsToReceivedToAdd;
      reception.productItems = customerReturn.productItems;

      await this._receptionRepository.save(reception);

      defaultSavLocation.totalItems += customerReturn.productItems.length;
      await this._locationRepository.save(defaultSavLocation);

      customerReturn.reception = reception;
      customerReturn.stockMovements = stockMovementsToAdd;
      await this._customerReturnRepository.save(customerReturn);

      this._updateMagentoDataService.updateProductsQuantities(variantsToUpdate);

      /**
       * Build and return the customer-return
       */
      customerReturn.reception = await this._receptionRepository.findOne({
        where: { id: customerReturn.reception.id },
        relations: ['storagePoint', 'child'],
      });

      customerReturn.productItems.map(async (productItem) => {
        productItem.location = await this._locationRepository.findOne({
          where: { id: productItem.locationId },
        });

        productItem.supplier = await this._supplierRepository.findOne({
          where: { id: productItem.supplierId },
          relations: ['address'],
        });
      });

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
        `${ValidateCustomerReturnService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: ValidateCustomerReturnInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get customerReturn
       */
      const customerReturn = await this._customerReturnRepository.findOne({
        where: {
          id: input.customerReturnId,
          relations: [
            'stockMovements',
            'reception',
            'productItems',
            'storagePoint',
            'order',
          ],
        },
      });

      if (!customerReturn) {
        throw new NotFoundException(
          `Customer return '${input.customerReturnId}' not found`,
        );
      }

      /**
       * Customer return state validation
       */
      if (customerReturn.state !== CustomerReturnState.SAVED) {
        throw new BadRequestException(
          `Can only validate ${CustomerReturnState.SAVED} customer return`,
        );
      }

      /**
       * Customer return user storage-point validation
       */
      if (
        user.workStation?.warehouse &&
        user.workStation.warehouse.reference !==
          customerReturn.storagePoint.reference
      ) {
        throw new UnauthorizedException(
          `You are not authorized to validate this customer return since you are not in ${customerReturn.storagePoint.name}`,
        );
      }

      return {
        customerReturn,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateCustomerReturnService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
