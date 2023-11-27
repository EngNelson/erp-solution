import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ProductItemItemOutput } from 'src/domain/dto/items';
import {
  MobileUnit,
  OtherOutput,
  StockMovement,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Area, Location } from 'src/domain/entities/warehouses';
import {
  MovementType,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import {
  MobileUnitRepository,
  OtherOutputRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { AddItemsToLocationInput, AddItemsToLocationOutput } from './dto';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
  UpdatedType,
} from 'src/domain/enums/warehouses';
import {
  SetProductQuantityModel,
  SetVariantQuantityModel,
} from 'src/domain/interfaces/items';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import {
  ProductsService,
  ProductVariantService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ProductQuantity } from 'src/domain/interfaces';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { OrderStep } from 'src/domain/enums/orders';

type ValidationResult = {
  location: Location;
  isDeadStock: boolean;
  isAvailableStock: boolean;
  isDepotVente: boolean;
  productItems: ProductItem[];
  isStorage: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddItemsToLocationService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    private readonly _productVariantService: ProductVariantService,
    private readonly _productService: ProductsService,
    private readonly _sharedService: SharedService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async addItemsToLocation(
    input: AddItemsToLocationInput,
    user: UserCon,
  ): Promise<AddItemsToLocationOutput> {
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
  ): Promise<AddItemsToLocationOutput> {
    try {
      const {
        location,
        isDeadStock,
        isAvailableStock,
        isDepotVente,
        productItems,
        isStorage,
        lang,
        user,
      } = result;

      const productItemsToEdit: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];
      const variantsToEditQuantities: SetVariantQuantityModel[] = [];
      const productsToEditQuantities: SetProductQuantityModel[] = [];

      /**
       * Change each item status to IN_STOCK
       * and location
       */
      let i = 1;
      await Promise.all(
        productItems.map(async (productItem) => {
          /**
           * Create stock movements
           */
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.INTERNAL;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = isStorage
            ? TriggeredBy.ENTREPOSAGE
            : TriggeredBy.STOCK_MOVEMENT;
          stockMovement.targetType = StockMovementAreaType.LOCATION;
          stockMovement.sourceType = StockMovementAreaType.LOCATION;
          stockMovement.createdBy = user;
          stockMovement.productItem = productItem;
          stockMovement.productItemId = productItem.id;
          stockMovement.targetLocation = location;
          stockMovement.targetLocationId = location.id;
          stockMovement.sourceLocation = productItem.location;
          stockMovement.sourceLocationId = productItem.locationId;

          stockMovementsToAdd.push(stockMovement);

          // Decrease totalItems from productItem.location
          let locationLine = locationsToEditTotalItems.find(
            (line) => line.location.id === productItem.locationId,
          );

          if (!locationLine) {
            locationLine = {
              location: productItem.location,
              quantity: 1,
              type: UpdatedType.REMOVE,
            };

            locationsToEditTotalItems.push(locationLine);
          } else {
            locationsToEditTotalItems.map((line) => {
              if (line.location.id === locationLine.location.id) {
                line.quantity += 1;
              }

              return line;
            });
          }

          const oldState = productItem.state;
          let newState: QuantityProprety;

          if (isDeadStock) {
            productItem.state = ItemState.IS_DEAD;
            productItem.status = StepStatus.IS_DEAD;
            newState = QuantityProprety.IS_DEAD;
          } else if (isAvailableStock) {
            productItem.state = ItemState.AVAILABLE;
            productItem.status = StepStatus.IN_STOCK;
            if (productItem.orderId) {
              const order = await this._orderRepository.findOne({
                where: { id: productItem.orderId },
              });
              if (order && order.orderStatus === StepStatus.READY) {
                order.orderStatus = StepStatus.TO_PICK_PACK;
                order.orderStep = OrderStep.PREPARATION_IN_PROGRESS;
                await this._orderRepository.save(order);
              }

              productItem.orderId = null;
            }
            if (productItem.mobileUnitId) {
              const mobileUnit = await this._mobileUnitRepository.findOne({
                where: { id: productItem.mobileUnitId },
              });
              if (mobileUnit) {
                mobileUnit.productItems = mobileUnit.productItems.filter(
                  (item) => item.id !== productItem.id,
                );
                await this._mobileUnitRepository.save(mobileUnit);
                productItem.mobileUnitId = null;
              }
            }
            if (productItem.otherOutputId) {
              const otherOutput = await this._otherOutputRepository.findOne({
                where: { id: productItem.otherOutputId },
              });
              if (otherOutput) {
                otherOutput.productItems = otherOutput.productItems.filter(
                  (item) => item.id !== productItem.id,
                );
                await this._otherOutputRepository.save(otherOutput);
                productItem.otherOutputId = null;
              }
            }
            newState = QuantityProprety.AVAILABLE;
          } else if (isDepotVente) {
            productItem.state = ItemState.DISCOVERED;
            productItem.status = StepStatus.DEPOSIT_SALE;
            newState = QuantityProprety.DISCOVERED;
          }

          productItem.location = location;
          productItem.locationId = location.id;

          productItemsToEdit.push(productItem);

          console.log(
            this._sharedService.getQuantityProperty(oldState),
            newState,
          );

          if (this._sharedService.getQuantityProperty(oldState) !== newState) {
            /**
             * Set product and variant quantities
             */
            const variantToUpdate = productItem.productVariant;
            const productToUpdate = await this._productRepository.findOne({
              where: {
                id: variantToUpdate.productId,
              },
            });

            //Add
            // Variant
            let addedVariantLine = variantsToEditQuantities.find(
              (line) =>
                line.variant.id === variantToUpdate.id &&
                line.property === newState,
            );

            if (!addedVariantLine) {
              addedVariantLine = {
                variant: variantToUpdate,
                quantity: 1,
                type: UpdatedType.ADD,
                property: newState,
              };

              variantsToEditQuantities.push(addedVariantLine);
            } else {
              variantsToEditQuantities.map((line) => {
                if (
                  line.variant.id === addedVariantLine.variant.id &&
                  line.property === newState
                ) {
                  line.quantity = i;
                }

                return line;
              });
            }

            // Product
            let addedProductLine = productsToEditQuantities.find(
              (line) =>
                line.product.id === productToUpdate.id &&
                line.property === newState,
            );

            if (!addedProductLine) {
              addedProductLine = {
                product: productToUpdate,
                quantity: 1,
                type: UpdatedType.ADD,
                property: newState,
              };

              productsToEditQuantities.push(addedProductLine);
            } else {
              productsToEditQuantities.map((line) => {
                if (
                  line.product.id === addedProductLine.product.id &&
                  line.property === newState
                ) {
                  line.quantity = i;
                }

                return line;
              });
            }

            // Remove
            // Variant
            let removeVariantLine = variantsToEditQuantities.find(
              (line) =>
                line.variant.id === variantToUpdate.id &&
                line.property ===
                  this._sharedService.getQuantityProperty(oldState),
            );

            if (!removeVariantLine) {
              removeVariantLine = {
                variant: variantToUpdate,
                quantity: 1,
                type: UpdatedType.REMOVE,
                property: this._sharedService.getQuantityProperty(oldState),
              };

              variantsToEditQuantities.push(removeVariantLine);
            } else {
              variantsToEditQuantities.map((line) => {
                if (
                  line.variant.id === removeVariantLine.variant.id &&
                  line.property ===
                    this._sharedService.getQuantityProperty(oldState)
                ) {
                  line.quantity = i;
                }

                return line;
              });
            }

            // Product
            let removeProductLine = productsToEditQuantities.find(
              (line) =>
                line.product.id === productToUpdate.id &&
                line.property ===
                  this._sharedService.getQuantityProperty(oldState),
            );

            if (!removeProductLine) {
              removeProductLine = {
                product: productToUpdate,
                quantity: 1,
                type: UpdatedType.REMOVE,
                property: this._sharedService.getQuantityProperty(oldState),
              };

              productsToEditQuantities.push(removeProductLine);
            } else {
              productsToEditQuantities.map((line) => {
                if (
                  line.product.id === removeProductLine.product.id &&
                  line.property ===
                    this._sharedService.getQuantityProperty(oldState)
                ) {
                  line.quantity = i;
                }

                return line;
              });
            }
          }
          i++;
        }),
      );

      /**
       * Increase and decrease location totalItems
       */

      const locationsToEdit: Location[] = [];

      locationsToEditTotalItems.map((locationLine) => {
        const { location, quantity, type } = locationLine;

        if (type === UpdatedType.ADD) {
          location.totalItems += quantity;
        }

        if (type === UpdatedType.REMOVE) {
          location.totalItems -= quantity;
        }

        locationsToEdit.push(location);
      });

      location.totalItems += productItemsToEdit.length;

      await this._locationRepository.save(location);
      await this._locationRepository.save(locationsToEdit);

      /**
       * Set Variants quantities
       */
      const variantsToEdit: ProductVariant[] = [];

      variantsToEditQuantities.map((variantLine) => {
        const { variant, quantity, type, property: proprety } = variantLine;

        const variantToEdit = this._productVariantService.setVariantQuantity(
          variant,
          quantity,
          type,
          proprety,
        );

        variantsToEdit.push(variantToEdit);
      });

      await this._productVariantRepository.save(variantsToEdit);

      this._updateMagentoDataService.updateProductsQuantities(variantsToEdit);

      /**
       * Set Products quantities
       */
      const productsToEdit: Product[] = [];

      productsToEditQuantities.map((productLine) => {
        const { product, quantity, type, property: proprety } = productLine;

        const productToEdit = this._productService.setProductQuantity(
          product,
          quantity,
          type,
          proprety,
        );

        productsToEdit.push(productToEdit);
      });

      await this._productRepository.save(productsToEdit);

      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._productItemRepository.save(productItemsToEdit);

      return new AddItemsToLocationOutput(
        productItemsToEdit.map((item) => new ProductItemItemOutput(item, lang)),
        productItemsToEdit.length,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddItemsToLocationService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: AddItemsToLocationInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const location = await this._locationRepository.findOne({
        where: { id: input.locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      const ancestors = await this._locationTreeRepository.findAncestors(
        location,
      );

      const parent = ancestors.find(
        (ancestor) => !isNullOrWhiteSpace(ancestor.areaId),
      );

      const area = await this._areaRepository.findOne({
        where: { id: parent.areaId },
      });

      /**
       * Cannot move items manually to output, preparation, reception, awaiting_sav and virtual area or location
       */
      if (
        (area.type === AreaType.DEFAULT &&
          (area.defaultType === AreaDefaultType.OUTPUT ||
            area.defaultType === AreaDefaultType.PREPARATION ||
            area.defaultType === AreaDefaultType.RECEPTION ||
            area.defaultType === AreaDefaultType.AWAITING_SAV)) ||
        area.isVirtual ||
        location.isVirtual
      ) {
        throw new BadRequestException(
          `You cannot move items manually to ${area.defaultType} or a virtual location.`,
        );
      }

      const isDeadStock =
        (location.type === AreaType.DEFAULT &&
          location.defaultType === LocationDefaultType.DEAD_STOCK) ||
        (parent.type === AreaType.DEFAULT &&
          parent.defaultType === LocationDefaultType.DEAD_STOCK) ||
        (area.type === AreaType.DEFAULT &&
          area.defaultType === AreaDefaultType.DEAD_STOCK);

      if (
        isDeadStock &&
        !user.roles.find((role) => role === AgentRoles.WAREHOUSE_MANAGER)
      ) {
        throw new UnauthorizedException(
          `You are not authorized to move a product to a dead location`,
        );
      }

      const isAvailableStock = area.type === AreaType.CUSTOM;

      const isDepotVente =
        area.type === AreaType.DEFAULT &&
        area.defaultType === AreaDefaultType.DEPOT_VENTE;

      if (
        isDepotVente &&
        !user.roles.find((role) => role === AgentRoles.WAREHOUSE_MANAGER)
      ) {
        throw new UnauthorizedException(
          `You are not authorized to move a product to a ${area.defaultType} location`,
        );
      }

      const productItems: ProductItem[] = [];

      await Promise.all(
        input.barcodes.map(async (barcode) => {
          const productItem = await this._productItemRepository.findOne({
            where: { barcode: barcode },
            relations: ['location', 'supplier', 'productVariant'],
          });
          if (!productItem) {
            throw new NotFoundException(
              `Product with barcode ${barcode} not found`,
            );
          }

          if (input.isStorage) {
            if (
              !(
                productItem.location &&
                productItem.status === StepStatus.IN_STOCK
              )
            ) {
              // throw new BadRequestException(
              //   `The product ${productItem.barcode} is already stored in the location '${productItem.location.name}'. Do you want to move this product?`,
              // );
              console.log(
                `The product ${productItem.barcode} is already stored in the location '${productItem.location.name}'. Do you want to move this product?`,
              );

              productItems.push(productItem);
            }

            if (productItem.status !== StepStatus.TO_STORE) {
              throw new BadRequestException(
                `The product '${productItem.barcode} is ${productItem.status}. You cannot store it.`,
              );
            }
          } else {
            productItems.push(productItem);
          }
        }),
      );

      return {
        location,
        isDeadStock,
        isAvailableStock,
        isDepotVente,
        productItems,
        isStorage: input.isStorage,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddItemsToLocationService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
