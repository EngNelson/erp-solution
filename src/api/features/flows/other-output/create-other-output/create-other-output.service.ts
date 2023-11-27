import {
  ISOLang,
  UserCon,
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
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
  ProductVariantToOutputModel,
  VariantToOutputLineModel,
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
import { UserService } from 'src/services/utilities';
import { CreateOtherOutputInput } from './dto';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import {
  MovementType,
  OutputStatus,
  OutputType,
  StepStatus,
  StockMovementAreaType,
  TriggerType,
  TriggeredBy,
} from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import { ItemState } from 'src/domain/enums/items';
import {
  AreaDefaultType,
  AreaType,
  LocationDefaultType,
  UpdatedType,
} from 'src/domain/enums/warehouses';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';

type ValidationResult = {
  storagePoint: StoragePoint;
  otherOutput: OtherOutput;
  variantsToOutputToConfirm: VariantToOutputLineModel[];
  defaultPreparationLocation: Location;
  defaultInternalNeedOutputLocation: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CreateOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(VariantToOutput)
    private readonly _variantToOutputRepository: VariantToOutputRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    private readonly _otherOutputService: OtherOutputService,
    private readonly _userService: UserService,
  ) {}

  async createOtherOutput(
    input: CreateOtherOutputInput,
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
        storagePoint,
        otherOutput,
        variantsToOutputToConfirm,
        defaultPreparationLocation,
        defaultInternalNeedOutputLocation,
        lang,
        user,
      } = result;

      const variantsToOutputToUpdate: VariantToOutput[] = [];
      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];

      if (variantsToOutputToConfirm.length > 0) {
        await Promise.all(
          variantsToOutputToConfirm.map(async (variantToOutputLine) => {
            const { variantToOutput, quantity, productItems, variant } =
              variantToOutputLine;

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
        `${CreateOtherOutputService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: CreateOtherOutputInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    const otherOutput = new OtherOutput();

    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the storage point
       */
      const storagePoint = await this._storagePointRepository.findOne({
        where: { reference: input.storagePointRef },
      });

      if (!storagePoint) {
        throw new NotFoundException(
          `The warehouse '${input.storagePointRef}' was not found.`,
        );
      }

      /**
       * magentoOrderID validation
       */
      if (
        isNullOrWhiteSpace(input.magentoOrderID) &&
        (input.outputType === OutputType.FLEET_OUTPUT ||
          input.outputType === OutputType.PUS_OUTPUT ||
          input.outputType === OutputType.SAV_OUTPUT ||
          input.outputType === OutputType.SUPPLIER_OUTPUT)
      ) {
        throw new BadRequestException(
          `Magento order ID is required for ${input.outputType}`,
        );
      }

      /**
       * Create the other output
       */
      otherOutput.reference =
        await this._otherOutputService.generateReference();
      otherOutput.barcode = await this._otherOutputService.generateBarCode();
      otherOutput.outputType = input.outputType;
      otherOutput.status = OutputStatus.CONFIRMED;
      otherOutput.storagePointId = storagePoint.id;
      otherOutput.storagePoint = storagePoint;

      if (!isNullOrWhiteSpace(input.magentoOrderID))
        otherOutput.magentoOrderID = input.magentoOrderID;

      if (!isNullOrWhiteSpace(input.comment)) {
        const comment: CommentModel = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };

        otherOutput.comments = [comment];
      }

      otherOutput.createdBy = user;

      await this._otherOutputRepository.save(otherOutput);

      /**
       * Get ProductItems from barcodes,
       * confirm product items and
       * build variantsToOutputToConfirm
       */
      const variantsToOutputToConfirm: VariantToOutputLineModel[] = [];
      const itemsStoragePointIds: string[] = [];

      const variantsToOutputModel: ProductVariantToOutputModel[] = [];

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

          const variantToOutputModel = variantsToOutputModel.find(
            (variantModel) =>
              variantModel.article.id === productItem.productVariantId,
          );

          if (!variantToOutputModel) {
            variantsToOutputModel.push({
              article: productItem.productVariant,
              quantity: 1,
            });
          } else {
            variantToOutputModel.quantity += 1;
          }
        }),
      );

      /**
       * Create variantToOutputs
       */
      const variantsToOutputToAdd: VariantToOutput[] = [];
      let position = 0;

      await Promise.all(
        variantsToOutputModel.map(async (variantToOutput) => {
          const { article, quantity } = variantToOutput;

          const variantToOutputToAdd = new VariantToOutput();

          variantToOutputToAdd.position = position;
          variantToOutputToAdd.quantity = quantity;
          variantToOutputToAdd.productVariantId = article.id;
          variantToOutputToAdd.productVariant = article;
          variantToOutputToAdd.otherOutputId = otherOutput.id;
          variantToOutputToAdd.otherOutput = otherOutput;
          variantToOutputToAdd.createdBy = user;

          variantsToOutputToAdd.push(variantToOutputToAdd);
          position++;
        }),
      );

      await this._variantToOutputRepository.save(variantsToOutputToAdd);

      otherOutput.variantsToOutput = variantsToOutputToAdd;

      await this._otherOutputRepository.save(otherOutput);

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

          const variantToOutput = await this._variantToOutputRepository.findOne(
            {
              where: {
                productVariantId: productItem.productVariantId,
                otherOutputId: otherOutput.id,
              },
            },
          );

          if (!variantToOutput) {
            throw new NotFoundException(`Oups! Something wrong happened !!!`);
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
        storagePoint,
        otherOutput,
        variantsToOutputToConfirm,
        defaultPreparationLocation,
        defaultInternalNeedOutputLocation,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      if (otherOutput.id) {
        const articlesToOutput = await this._variantToOutputRepository.find({
          where: { otherOutputId: otherOutput.id },
        });
        const ids: string[] = [];
        articlesToOutput.map((articleToOutput) => ids.push(articleToOutput.id));

        await this._variantToOutputRepository.delete(ids);
        await this._otherOutputRepository.delete(otherOutput.id);
      }

      throw new BadRequestException(
        `${CreateOtherOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
