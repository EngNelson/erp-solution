import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { MobileUnitItemOutput } from 'src/domain/dto/flows';
import {
  MobileUnit,
  StockMovement,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  MobileUnitStatus,
  MovementType,
  StatusLine,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import {
  AreaDefaultType,
  LocationDefaultType,
  UpdatedType,
} from 'src/domain/enums/warehouses';
import {
  MobileUnitRepository,
  StockMovementRepository,
  TransfertRepository,
  VariantTransfertRepository,
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
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { EditMobileUnitInput } from './dto';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';
import {
  SetProductQuantityModel,
  SetVariantQuantityModel,
} from 'src/domain/interfaces/items';
import {
  MobileUnitService,
  ProductVariantService,
  ProductsService,
} from 'src/services/generals';

type ValidationResult = {
  mobileUnit: MobileUnit;
  productItems: ProductItem[];
  itemsScanned: ProductItem[];
  defaultExpeditionOutputLocation: Location;
  transfert: Transfert;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditMobileUnitService {
  constructor(
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    private readonly _productVariantService: ProductVariantService,
    private readonly _productService: ProductsService,
    private readonly _mobileUnitService: MobileUnitService,
  ) {}

  async editMobileUnit(
    input: EditMobileUnitInput,
    user: UserCon,
  ): Promise<MobileUnitItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditMobileUnitInput,
    result: ValidationResult,
  ): Promise<MobileUnitItemOutput> {
    try {
      const {
        mobileUnit,
        productItems,
        itemsScanned,
        defaultExpeditionOutputLocation,
        transfert,
        lang,
        user,
      } = result;

      const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];
      const variantsToEditQuantities: SetVariantQuantityModel[] = [];
      const productsToEditQuantities: SetProductQuantityModel[] = [];
      const stockMovementsToAdd: StockMovement[] = [];

      if (input.name) {
        mobileUnit.name = input.name;
      }

      if (input.description) {
        if (mobileUnit.description) {
          for (const lang in input.description) {
            mobileUnit.description[lang] = input.description[lang];
          }
        } else {
          mobileUnit.description = input.description;
        }
      }

      if (input.isReception) {
        if (input.status) {
          mobileUnit.status = input.status;
        } else if (mobileUnit.productItems.length === 0) {
          mobileUnit.status = MobileUnitStatus.COMPLETE;
        } else if (
          mobileUnit.productItems.length > 0 &&
          productItems.length < mobileUnit.productItems.length
        ) {
          mobileUnit.status = MobileUnitStatus.PROCESSING;
        }
      } else {
        mobileUnit.status = MobileUnitStatus.CLOSED;
      }

      let i = 1;

      if (productItems && productItems.length > 0) {
        if (!input.isReception) {
          for (const productItem of productItems) {
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.INTERNAL;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.PICK_PACK;
            stockMovement.sourceType = StockMovementAreaType.LOCATION;
            stockMovement.targetType = StockMovementAreaType.LOCATION;
            stockMovement.createdBy = user;

            stockMovement.productItem = productItem;
            stockMovement.productItemId = productItem.id;

            stockMovement.transfert = transfert;
            stockMovement.transfertId = transfert.id;

            stockMovement.sourceLocation = productItem.location;
            stockMovement.sourceLocationId = productItem.locationId;

            stockMovement.targetLocation = defaultExpeditionOutputLocation;
            stockMovement.targetLocationId = defaultExpeditionOutputLocation.id;

            stockMovementsToAdd.push(stockMovement);

            let addedLocationLine = locationsToEditTotalItems.find(
              (line) => line.location.id === defaultExpeditionOutputLocation.id,
            );

            if (!addedLocationLine) {
              addedLocationLine = {
                location: defaultExpeditionOutputLocation,
                quantity: 1,
                type: UpdatedType.ADD,
              };

              locationsToEditTotalItems.push(addedLocationLine);
            } else {
              locationsToEditTotalItems.map((line) => {
                if (line.location.id === addedLocationLine.location.id) {
                  line.quantity += 1;
                }

                return line;
              });
            }

            let removeLocationLine = locationsToEditTotalItems.find(
              (line) => line.location.id === productItem.locationId,
            );

            if (!removeLocationLine) {
              removeLocationLine = {
                location: productItem.location,
                quantity: 1,
                type: UpdatedType.REMOVE,
              };

              locationsToEditTotalItems.push(removeLocationLine);
            } else {
              locationsToEditTotalItems.map((line) => {
                if (line.location.id === removeLocationLine.location.id) {
                  line.quantity += 1;
                }

                return line;
              });
            }

            productItem.location = defaultExpeditionOutputLocation;
            productItem.locationId = defaultExpeditionOutputLocation.id;

            const variantToUpdate = productItem.productVariant;
            const productToUpdate = await this._productRepository.findOne({
              where: { id: variantToUpdate.productId },
            });

            let addedVariantLine = variantsToEditQuantities.find(
              (line) =>
                line.variant.id === variantToUpdate.id &&
                line.property === QuantityProprety.RESERVED,
            );

            if (!addedVariantLine) {
              addedVariantLine = {
                variant: variantToUpdate,
                quantity: 1,
                type: UpdatedType.ADD,
                property: QuantityProprety.RESERVED,
              };

              variantsToEditQuantities.push(addedVariantLine);
            } else {
              variantsToEditQuantities.map((line) => {
                if (line.variant.id === addedVariantLine.variant.id) {
                  line.quantity = i;
                }

                return line;
              });
            }

            let removeVariantLine = variantsToEditQuantities.find(
              (line) =>
                line.variant.id === variantToUpdate.id &&
                line.property === QuantityProprety.AVAILABLE,
            );

            if (!removeVariantLine) {
              removeVariantLine = {
                variant: variantToUpdate,
                quantity: 1,
                type: UpdatedType.REMOVE,
                property: QuantityProprety.AVAILABLE,
              };

              variantsToEditQuantities.push(removeVariantLine);
            } else {
              variantsToEditQuantities.map((line) => {
                if (line.variant.id === removeVariantLine.variant.id) {
                  line.quantity = i;
                }

                return line;
              });
            }

            let addedProductLine = productsToEditQuantities.find(
              (line) =>
                line.product.id === productToUpdate.id &&
                line.property === QuantityProprety.RESERVED,
            );

            if (!addedProductLine) {
              addedProductLine = {
                product: productToUpdate,
                quantity: 1,
                type: UpdatedType.ADD,
                property: QuantityProprety.RESERVED,
              };

              productsToEditQuantities.push(addedProductLine);
            } else {
              productsToEditQuantities.map((line) => {
                if (line.product.id === addedProductLine.product.id) {
                  line.quantity = i;
                }

                return line;
              });
            }

            let removeProductLine = productsToEditQuantities.find(
              (line) =>
                line.product.id === productToUpdate.id &&
                line.property === QuantityProprety.AVAILABLE,
            );

            if (!removeProductLine) {
              removeProductLine = {
                product: productToUpdate,
                quantity: 1,
                type: UpdatedType.REMOVE,
                property: QuantityProprety.AVAILABLE,
              };

              productsToEditQuantities.push(removeProductLine);
            } else {
              productsToEditQuantities.map((line) => {
                if (line.product.id === removeProductLine.product.id) {
                  line.quantity = i;
                }

                return line;
              });
            }

            i++;

            productItem.state = ItemState.RESERVED;
            productItem.status = StepStatus.PICKED_UP;
          }

          mobileUnit.productItems = productItems;
        }
      }

      if (input.isReception && itemsScanned && itemsScanned.length > 0) {
        itemsScanned.map((item) => {
          if (mobileUnit.barcodesScanned) {
            if (
              !mobileUnit.barcodesScanned.find(
                (barcode) => barcode === item.barcode,
              )
            ) {
              mobileUnit.barcodesScanned.push(item.barcode);
            }
          } else {
            mobileUnit.barcodesScanned = [item.barcode];
          }
        });
      }

      mobileUnit.updatedBy = user;

      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._productItemRepository.save(productItems);
      await this._mobileUnitRepository.save(mobileUnit);

      /**
       * Increase and decrease location totalItems
       */
      const locationsToEdit: Location[] = [];

      locationsToEditTotalItems.map((locationLine) => {
        const { location, quantity, type } = locationLine;

        if (type === UpdatedType.ADD && location) {
          location.totalItems += quantity;
        }

        if (type === UpdatedType.REMOVE && location) {
          location.totalItems -= quantity;
        }

        if (location) locationsToEdit.push(location);
      });

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

      const variantTransfertsToEdit: VariantTransfert[] = [];

      productItems.map((productItem) => {
        transfert.variantTransferts.map((variantTransfert) => {
          if (variantTransfert.variantId === productItem.productVariantId) {
            variantTransfert.pickedQuantity++;
          }

          if (variantTransfert.quantity === variantTransfert.pickedQuantity) {
            variantTransfert.status = StatusLine.PACKED;
          }

          variantTransfertsToEdit.push(variantTransfert);

          return variantTransfert;
        });
      });

      await this._variantTransfertRepository.save(variantTransfertsToEdit);
      await this._transfertRepository.save(transfert);

      if (mobileUnit.productItems?.length > 0) {
        await Promise.all(
          mobileUnit.productItems.map(async (productItem) => {
            productItem.productVariant =
              await this._productVariantRepository.findOne({
                where: { id: productItem.productVariantId },
              });

            return productItem;
          }),
        );
      }

      const mobileUnitModel =
        await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

      return new MobileUnitItemOutput(mobileUnitModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${EditMobileUnitService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditMobileUnitInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const mobileUnit = await this._mobileUnitRepository.findOne(
        input.mobileUnitId,
        { relations: ['transfert', 'productItems'] },
      );

      if (!mobileUnit) {
        throw new NotFoundException(`Mobile unit to edit not found`);
      }

      // let transfert: Transfert;
      const transfert = await this._transfertRepository.findOne(
        mobileUnit.transfertId,
        { relations: ['variantTransferts'] },
      );

      /**
       * Get the defaultExpeditionOutputLocation for the source storage-point
       */
      const sourceStoragePoint = await this._storagePointRepository.findOne(
        mobileUnit.transfert.sourceId,
        { relations: ['areas'] },
      );
      if (!sourceStoragePoint) {
        throw new InternalServerErrorException(
          `An error occured. Please try again`,
        );
      }

      const defaultOutputArea = await this._areaRepository.findOne({
        storagePointId: sourceStoragePoint.id,
        defaultType: AreaDefaultType.OUTPUT,
      });
      if (!defaultOutputArea) {
        throw new InternalServerErrorException(
          `This storage point does have output area`,
        );
      }

      const defaultExpeditionOutputLocation =
        await this._locationRepository.findOne({
          areaId: defaultOutputArea.id,
          defaultType: LocationDefaultType.EXPEDITION,
        });

      if (!defaultExpeditionOutputLocation) {
        throw new InternalServerErrorException(
          `An error occured. Please try again`,
        );
      }

      const storagePointLocations: Location[] = [];
      await Promise.all(
        sourceStoragePoint?.areas.map(async (area) => {
          const locations = await this._locationRepository.find({
            areaId: area.id,
          });

          await Promise.all(
            locations?.map(async (location) => {
              const locationsTree =
                await this._locationTreeRepository.findDescendants(location);

              storagePointLocations.push(...locationsTree);
            }),
          );
        }),
      );

      /**
       * Get items from barcodes provided
       * And then check if each item has
       * his variant in the transfert
       */
      const productItems: ProductItem[] = [];
      const itemsScanned: ProductItem[] = [];

      if (input.itemBarCodes && input.itemBarCodes.length > 0) {
        await Promise.all(
          input.itemBarCodes.map(async (barcode) => {
            const productItem = await this._productItemRepository.findOne(
              { barcode },
              { relations: ['location', 'productVariant'] },
            );

            if (!productItem) {
              throw new NotFoundException(
                `The product of barcode '${barcode}' is not found`,
              );
            }

            // if (
            //   (productItem.state !== ItemState.AVAILABLE ||
            //     productItem.status !== StepStatus.IN_STOCK) &&
            //   productItem.status !== StepStatus.TO_STORE &&
            //   !mobileUnit.productItems.some(
            //     (existingItem) => existingItem.id === productItem.id,
            //   ) &&
            //   !mobileUnit.barcodesScanned?.some(
            //     (barcode) => barcode === productItem.barcode,
            //   )
            // ) {
            //   throw new HttpException(
            //     `The product of barcode '${barcode}' is not available in stock`,
            //     HttpStatus.BAD_REQUEST,
            //   );
            // }

            /**
             * Is the product item added is presently
             * in the source storage point ?
             */
            if (
              !storagePointLocations.some(
                (location) => location.id === productItem.locationId,
              ) &&
              !input.isReception
            ) {
              throw new BadRequestException(
                `The product with barcode '${barcode}' is not presently in '${sourceStoragePoint.name}' storage point`,
              );
            }

            if (
              !transfert.variantTransferts.some(
                (transfertLine) =>
                  transfertLine.variantId === productItem.productVariantId,
              )
            ) {
              throw new NotFoundException(
                `The product of barcode '${barcode}' is not within the transfert ${transfert.reference}`,
              );
            }

            productItems.push(productItem);

            if (input.isReception) itemsScanned.push(productItem);
          }),
        );
      }

      return {
        mobileUnit,
        productItems,
        itemsScanned,
        defaultExpeditionOutputLocation,
        transfert,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditMobileUnitService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
