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
import {
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import {
  OtherOutput,
  StockMovement,
  VariantToOutput,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  MovementType,
  OutputStatus,
  OutputType,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  VariantToOutputLineModel,
  VariantToOutputToReportModel,
} from 'src/domain/interfaces/flows';
import {
  OtherOutputRepository,
  StockMovementRepository,
  VariantToOutputRepository,
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
import { OtherOutputService } from 'src/services/generals';
import { ConfirmOtherOutputInput } from './dto';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
  UpdatedType,
} from 'src/domain/enums/warehouses';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';

type ValidationResult = {
  otherOutput: OtherOutput;
  partialConfirmation: boolean;
  variantsToOutputToConfirm: VariantToOutputLineModel[];
  defaultPreparationLocation: Location;
  defaultInternalNeedOutputLocation: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ConfirmOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(VariantToOutput)
    private readonly _variantToOutputRepository: VariantToOutputRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _otherOutputService: OtherOutputService,
  ) {}

  async confirmOtherOutput(
    input: ConfirmOtherOutputInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
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
  ): Promise<OtherOutputItemOutput> {
    try {
      const {
        otherOutput,
        partialConfirmation,
        variantsToOutputToConfirm,
        defaultPreparationLocation,
        defaultInternalNeedOutputLocation,
        lang,
        user,
      } = result;

      const variantsToOutputToUpdate: VariantToOutput[] = [];
      const variantsToOutputToReport: VariantToOutputToReportModel[] = [];
      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];

      if (variantsToOutputToConfirm.length > 0) {
        await Promise.all(
          variantsToOutputToConfirm.map(async (variantToOutputLine) => {
            const { variantToOutput, quantity, productItems, variant } =
              variantToOutputLine;

            if (quantity < variantToOutput.quantity) {
              variantsToOutputToReport.push({
                variant,
                quantity: variantToOutput.quantity - quantity,
              });
            }

            variantToOutput.quantity = quantity;
            // variantToOutput.otherOutput = otherOutput;
            // variantToOutput.otherOutputId = otherOutput.id;

            variantsToOutputToUpdate.push(variantToOutput);

            /**
             * Create stockMovements
             * Set each product item state, status and location
             * Set products and variants available quantities
             * Set each location totalItems
             */
            await Promise.all(
              productItems.map(async (productItem) => {
                const stockMovement = new StockMovement();

                stockMovement.movementType = MovementType.INTERNAL;
                stockMovement.triggerType = TriggerType.MANUAL;
                stockMovement.triggeredBy = TriggeredBy.OTHER_OUTPUT;
                stockMovement.sourceType = StockMovementAreaType.LOCATION;
                stockMovement.targetType = StockMovementAreaType.LOCATION;
                stockMovement.createdBy = user;

                stockMovement.productItem = productItem;
                stockMovement.productItemId = productItem.id;

                stockMovement.otherOutput = otherOutput;
                stockMovement.otherOutputId = otherOutput.id;

                stockMovement.sourceLocation = productItem.location;
                stockMovement.sourceLocationId = productItem.locationId;

                stockMovement.targetLocation =
                  otherOutput.outputType === OutputType.INTERNAL_NEED
                    ? defaultInternalNeedOutputLocation
                    : defaultPreparationLocation;
                stockMovement.targetLocationId =
                  otherOutput.outputType === OutputType.INTERNAL_NEED
                    ? defaultInternalNeedOutputLocation.id
                    : defaultPreparationLocation.id;

                stockMovementsToAdd.push(stockMovement);

                // Set each location totalItems
                if (otherOutput.outputType === OutputType.INTERNAL_NEED) {
                  let addedLocationLine = locationsToEditTotalItems.find(
                    (line) =>
                      line.location.id === defaultInternalNeedOutputLocation.id,
                  );

                  if (!addedLocationLine) {
                    addedLocationLine = {
                      location: defaultInternalNeedOutputLocation,
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
                } else {
                  let addedLocationLine = locationsToEditTotalItems.find(
                    (line) =>
                      line.location.id === defaultPreparationLocation.id,
                  );

                  if (!addedLocationLine) {
                    addedLocationLine = {
                      location: defaultPreparationLocation,
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

                // Set products and variants available quantities
                const productToEdit =
                  await this._productRepository.findOneOrFail(
                    variant.productId,
                  );

                if (productItem.state === ItemState.AVAILABLE) {
                  variant.quantity.available -= 1;
                  variant.quantity.reserved += 1;
                  productToEdit.quantity.available -= 1;
                  productToEdit.quantity.reserved += 1;

                  await this._productRepository.save(productToEdit);
                  await this._productVariantRepository.save(variant);
                }

                // Set each product item state, status and location
                productItem.state = ItemState.RESERVED;
                productItem.status = StepStatus.READY;
                productItem.location =
                  otherOutput.outputType === OutputType.INTERNAL_NEED
                    ? defaultInternalNeedOutputLocation
                    : defaultPreparationLocation;
                productItem.locationId =
                  otherOutput.outputType === OutputType.INTERNAL_NEED
                    ? defaultInternalNeedOutputLocation.id
                    : defaultPreparationLocation.id;

                productItemsToUpdate.push(productItem);
              }),
            );

            await this._variantToOutputRepository.save(
              variantsToOutputToUpdate,
            );
            await this._stockMovementRepository.save(stockMovementsToAdd);
            await this._productItemRepository.save(productItemsToUpdate);
          }),
        );
      }

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

      await this._locationRepository.save(locationsToEdit);

      if (variantsToOutputToReport.length > 0) {
        const childOutput = new OtherOutput();

        childOutput.reference =
          await this._otherOutputService.generateReference(otherOutput, true);
        childOutput.barcode = await this._otherOutputService.generateBarCode();
        childOutput.outputType = otherOutput.outputType;
        childOutput.status = partialConfirmation
          ? OutputStatus.PENDING
          : OutputStatus.CANCELED;
        childOutput.storagePointId = otherOutput.storagePointId;
        childOutput.storagePoint = otherOutput.storagePoint;
        childOutput.parent = otherOutput;
        childOutput.createdBy = user;

        await this._otherOutputRepository.save(childOutput);

        const variantsToOutputToAdd: VariantToOutput[] = [];

        let position = 0;

        variantsToOutputToReport.map((variantOutputToReport) => {
          const { variant, quantity } = variantOutputToReport;

          const newVariantToOutput = new VariantToOutput();

          newVariantToOutput.position = position;
          newVariantToOutput.quantity = quantity;
          newVariantToOutput.productVariantId = variant.id;
          newVariantToOutput.productVariant = variant;
          newVariantToOutput.otherOutputId = childOutput.id;
          newVariantToOutput.otherOutput = childOutput;
          newVariantToOutput.createdBy = user;

          position++;

          variantsToOutputToAdd.push(newVariantToOutput);
        });

        await this._variantToOutputRepository.save(variantsToOutputToAdd);

        childOutput.variantsToOutput = variantsToOutputToAdd;

        await this._otherOutputRepository.save(childOutput);

        otherOutput.child = childOutput;

        await this._otherOutputRepository.save(otherOutput);
      }

      /**
       * Set other output status to CONFIRMED
       * and confirmedAt to now
       */
      // otherOutput.variantsToOutput = variantsToOutputToUpdate;
      otherOutput.status = OutputStatus.CONFIRMED;
      otherOutput.confirmedAt = new Date();
      otherOutput.confirmedBy = user;
      otherOutput.productItems = productItemsToUpdate;
      otherOutput.stockMovements = stockMovementsToAdd;

      await this._otherOutputRepository.save(otherOutput);

      /**
       * Build and return the output
       */
      const output = await this._otherOutputRepository.findOneOrFail(
        otherOutput.id,
        {
          relations: [
            'storagePoint',
            'variantsToOutput',
            'productItems',
            'stockMovements',
          ],
        },
      );

      const otherOutputModel =
        await this._otherOutputService.buildOtherOutputOutput(output);

      return new OtherOutputItemOutput(otherOutputModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ConfirmOtherOutputService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ConfirmOtherOutputInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the otherOutput to confirm
       */
      const otherOutput = await this._otherOutputRepository.findOne(
        { reference: input.outputReference },
        { relations: ['storagePoint', 'variantsToOutput', 'productItems'] },
      );

      if (!otherOutput) {
        throw new NotFoundException(
          `Output of reference ${input.outputReference} is not found`,
        );
      }

      // Can only confirm PENDING output
      if (otherOutput.status !== OutputStatus.PENDING) {
        throw new BadRequestException(
          `The output ${otherOutput.reference} is already ${otherOutput.status}.`,
        );
      }

      /**
       * Get ProductItems from barcodes,
       * confirm product items and
       * build variantsToOutputToConfirm
       */
      const variantsToOutputToConfirm: VariantToOutputLineModel[] = [];
      const itemsStoragePointIds: string[] = [];

      await Promise.all(
        input.barcodes.map(async (barcode) => {
          const productItem = await this._productItemRepository.findOne(
            { barcode: barcode },
            { relations: ['productVariant', 'location'] },
          );

          if (!productItem) {
            throw new NotFoundException(
              `ProductItem with barcode ${barcode} not found`,
            );
          }

          // Is the item belong to the storagePoint
          const itemLocation = productItem.location;
          const ancestors = await this._locationTreeRepository.findAncestors(
            itemLocation,
          );

          const parent = ancestors.find(
            (ancestor) => !isNullOrWhiteSpace(ancestor.areaId),
          );

          const area = await this._areaRepository.findOne({
            id: parent.areaId,
          });

          if (otherOutput.storagePoint) {
            if (area.storagePointId !== otherOutput.storagePointId) {
              throw new BadRequestException(
                `The product ${getLangOrFirstAvailableValue(
                  productItem.productVariant.title,
                  lang,
                )} of barcode ${barcode} is not currently in ${
                  otherOutput.storagePoint.name
                } warehouse`,
              );
            }
          }

          if (!itemsStoragePointIds.find((id) => id === area.storagePointId)) {
            itemsStoragePointIds.push(area.storagePointId);
          }

          /**
           * Is the product is AVAILABLE  or RESERVED ?
           * If RESERVED
           * ****** is the product belong to order
           */
          if (
            productItem.state !== ItemState.AVAILABLE &&
            productItem.state !== ItemState.RESERVED
          ) {
            throw new BadRequestException(
              `The product of barcode ${productItem.barcode} is ${productItem.state}`,
            );
          }

          if (productItem.state === ItemState.RESERVED) {
          }

          const variantToOutput = await this._variantToOutputRepository.findOne(
            {
              where: { productVariantId: productItem.productVariantId },
              relations: ['otherOutput'],
            },
          );

          if (!variantToOutput) {
            throw new BadRequestException(
              `The product ${getLangOrFirstAvailableValue(
                productItem.productVariant.title,
                lang,
              )} does not belong to the output ${otherOutput.reference}`,
            );
          }

          let outputLine = variantsToOutputToConfirm.find(
            (variantToOutputLine) =>
              variantToOutputLine.variantToOutput.id === variantToOutput.id &&
              variantToOutputLine.variant.id === productItem.productVariantId,
          );

          if (!outputLine) {
            outputLine = {
              variantToOutput,
              quantity: 1,
              productItems: [productItem],
              variant: productItem.productVariant,
            };
            variantsToOutputToConfirm.push(outputLine);
          } else {
            outputLine.quantity += 1;
            outputLine.productItems.push(productItem);
          }

          /**
           * Validate each product quantity
           */
          if (outputLine.quantity > variantToOutput.quantity) {
            throw new BadRequestException(
              `You added the product ${getLangOrFirstAvailableValue(
                productItem.productVariant.title,
                lang,
              )} more than needed`,
            );
          }
        }),
      );

      if (!otherOutput.storagePoint && itemsStoragePointIds.length > 1) {
        throw new BadRequestException(
          `Some product you are trying to output do not belong to your warehouse`,
        );
      }

      if (!otherOutput.storagePoint) {
        const location = variantsToOutputToConfirm[0].productItems[0].location;

        const ancestors = await this._locationTreeRepository.findAncestors(
          location,
        );

        const parent = ancestors.find(
          (ancestor) => !isNullOrWhiteSpace(ancestor.areaId),
        );

        const area = await this._areaRepository.findOne({ id: parent.areaId });

        const storagePoint = await this._storagePointRepository.findOne({
          id: area.storagePointId,
        });

        otherOutput.storagePoint = storagePoint;
        otherOutput.storagePointId = storagePoint.id;
      }

      // Get defaultPreparationLocation
      const defaultPreparationArea = await this._areaRepository.findOne({
        where: {
          type: AreaType.DEFAULT,
          defaultType: AreaDefaultType.PREPARATION,
          storagePointId: otherOutput.storagePointId,
        },
      });

      if (!defaultPreparationArea) {
        throw new InternalServerErrorException(
          `There is no default preparation area in this storage point.`,
        );
      }

      const defaultPreparationLocation = await this._locationRepository.findOne(
        {
          where: {
            type: AreaType.DEFAULT,
            defaultType: LocationDefaultType.PREPARATION,
            areaId: defaultPreparationArea.id,
          },
        },
      );

      if (!defaultPreparationLocation) {
        throw new InternalServerErrorException(
          `There is no default preparation location in this storage point`,
        );
      }

      let defaultInternalNeedOutputLocation: Location;

      if (otherOutput.outputType === OutputType.INTERNAL_NEED) {
        // Get defautl internalNeed output location
        const defaultOutputArea = await this._areaRepository.findOne({
          where: {
            type: AreaType.DEFAULT,
            defaultType: AreaDefaultType.OUTPUT,
            storagePointId: otherOutput.storagePointId,
          },
        });

        if (!defaultOutputArea) {
          throw new InternalServerErrorException(
            `There is no default output area in this storage point.`,
          );
        }

        defaultInternalNeedOutputLocation =
          await this._locationRepository.findOne({
            where: {
              type: AreaType.DEFAULT,
              defaultType: LocationDefaultType.INTERNAL_NEED,
              areaId: defaultOutputArea.id,
            },
          });

        if (!defaultInternalNeedOutputLocation) {
          throw new InternalServerErrorException(
            `There is no default internal need output location in this storage point`,
          );
        }
      }

      return {
        otherOutput,
        partialConfirmation: input.partialConfirmation,
        variantsToOutputToConfirm,
        defaultPreparationLocation,
        defaultInternalNeedOutputLocation,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ConfirmOtherOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
