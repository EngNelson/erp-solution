import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  FROM_EMAIL,
  getLangOrFirstAvailableValue,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import {
  MobileUnit,
  OrderProcessing,
  Reception,
  StockMovement,
  Transfert,
} from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { Location } from 'src/domain/entities/warehouses';
import {
  MovementType,
  OperationLineState,
  OperationStatus,
  ReceptionType,
  StepStatus,
  StockMovementAreaType,
  TransfertStatus,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import {
  TransfertModel,
  VariantsToTransfertModel,
} from 'src/domain/types/flows';
import {
  MobileUnitRepository,
  OrderProcessingRepository,
  ReceptionRepository,
  StockMovementRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { LocationRepository } from 'src/repositories/warehouses';
import { ReceptionService } from 'src/services/references/flows';
import { SharedService } from 'src/services/utilities';
import { ValidateTransfertInput } from './dto';
import {
  MobileUnitService,
  ProductVariantService,
  ProductsService,
} from 'src/services/generals';
import {
  EmailInputModel,
  EmailInputModelWithTemplate,
} from 'src/domain/interfaces';
import { SendingEmailService } from 'src/services/email';
import { HttpService } from '@nestjs/axios';
import {
  SENDING_EMAIL_QUEUE,
  USERS_RESOURCE,
} from 'src/domain/constants/public.constants';
import { EmailTemplateName, JobProcess } from 'src/domain/enums/email';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import { OrderStep } from 'src/domain/enums/orders';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  SetVariantQuantityModel,
  SetProductQuantityModel,
} from 'src/domain/interfaces/items';
import { EditLocationTotalItemsModel } from 'src/domain/interfaces/warehouses';
import { UpdatedType } from 'src/domain/enums/warehouses';
import { OrderReferenceService } from 'src/services/references/orders';

type ValidationResult = {
  transfert: Transfert;
  mobileUnits: MobileUnit[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateTransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectQueue('emailSending')
    private readonly _sendingEmailQueue: Queue,
    private readonly _receptionReferenceService: ReceptionService,
    private readonly _sharedService: SharedService,
    // private readonly _sendingEmailService: SendingEmailService,
    private readonly _httpService: HttpService,
    private readonly _productVariantService: ProductVariantService,
    private readonly _productService: ProductsService,
    private readonly _mobileUnitService: MobileUnitService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async validateTransfert(
    input: ValidateTransfertInput,
    user: UserCon,
    accessToken: string,
  ): Promise<TransfertItemDetailsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      validationResult,
      accessToken,
    );

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
    accessToken: string,
  ): Promise<TransfertItemDetailsOutput> {
    try {
      const { transfert, mobileUnits, lang, user } = result;

      transfert.status = TransfertStatus.VALIDATED;
      transfert.mobileUnits = mobileUnits;
      transfert.validatedBy = user;
      transfert.validatedAt = new Date();

      await this._transfertRepository.save(transfert);

      // TODO: correctly treat the after transfert validation
      /**
       * If transfert order: get the order
       *
       */
      if (transfert.order) {
        const order = await this._orderRepository.findOne(transfert.orderId);

        if (order) {
          const lastOrderProcessing =
            await this._orderProcessingRepository.findOne({
              where: {
                state: order.orderStep,
                status: order.orderStatus,
                orderId: order.id,
              },
            });

          if (lastOrderProcessing) {
            lastOrderProcessing.endDate = new Date();
            await this._orderProcessingRepository.save(lastOrderProcessing);
          }

          order.orderStatus = StepStatus.TO_RECEIVED;
          order.orderStep = OrderStep.IN_TRANSIT;

          await this._orderRepository.save(order);

          const orderProcessing = new OrderProcessing();

          orderProcessing.reference =
            await this._orderReferenceService.generateOrderProcessingReference(
              order,
            );
          orderProcessing.state = order.orderStep;
          orderProcessing.status = order.orderStatus;
          orderProcessing.startDate = new Date();
          orderProcessing.orderId = order.id;
          orderProcessing.order = order;

          await this._orderProcessingRepository.save(orderProcessing);
        } else {
          console.log(
            `The order linked to thre transfer ${transfert.reference} was not found`,
          );
        }
      }

      /**
       * Create new reception on target storage-point
       */
      const reception = new Reception();

      reception.reference =
        await this._receptionReferenceService.generateReference(
          reception,
          false,
        );
      reception.type = ReceptionType.TRANSFERT;
      reception.status = OperationStatus.PENDING;
      reception.mobileUnits = mobileUnits;

      if (transfert.order) {
        reception.order = transfert.order;
        reception.orderId = transfert.orderId;
      }

      reception.storagePoint = transfert.target;
      reception.storagePointId = transfert.targetId;

      await this._receptionRepository.save(reception);

      /**
       * Set all items state to IN_TRANSIT
       * Set product and variant quantities for each item
       * set available, inTransit
       */
      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const mobileUnitsToUpdate: MobileUnit[] = [];
      // const locationsToEditTotalItems: Location[] = [];
      // const variantsToEditQuantities: ProductVariant[] = [];
      // const productsToEditQuantities: Product[] = [];

      const locationsToEditTotalItems: EditLocationTotalItemsModel[] = [];
      const variantsToEditQuantities: SetVariantQuantityModel[] = [];
      const productsToEditQuantities: SetProductQuantityModel[] = [];

      // Get items locations
      await Promise.all(
        mobileUnits.map(async (mobileUnit) => {
          await Promise.all(
            mobileUnit.productItems.map(async (item) => {
              item.location = await this._locationRepository.findOne({
                id: item.locationId,
              });

              item.productVariant =
                await this._productVariantRepository.findOne({
                  where: { id: item.productVariantId },
                  relations: ['product'],
                });

              return item;
            }),
          );
        }),
      );

      for (const mobileUnit of mobileUnits) {
        /**
         * link mobile unit to reception
         */
        mobileUnit.reception = reception;
        mobileUnit.receptionId = reception.id;

        mobileUnitsToUpdate.push(mobileUnit);

        let i = 1;

        for (const item of mobileUnit.productItems) {
          item.state = ItemState.IN_TRANSIT;
          item.status = StepStatus.TO_RECEIVED;

          /**
           * Create stock movements for each item
           */
          const stockMovement = new StockMovement();

          stockMovement.movementType = MovementType.OUT;
          stockMovement.triggerType = TriggerType.AUTO;
          stockMovement.triggeredBy = TriggeredBy.TRANSFERT;
          stockMovement.createdBy = user;

          stockMovement.productItem = item;
          stockMovement.productItemId = item.id;

          stockMovement.transfert = transfert;
          stockMovement.transfertId = transfert.id;

          stockMovement.sourceType = StockMovementAreaType.LOCATION;
          stockMovement.targetType = StockMovementAreaType.IN_TRANSIT;

          stockMovement.sourceLocation = item.location;
          stockMovement.sourceLocationId = item.locationId;

          stockMovementsToAdd.push(stockMovement);

          /**
           * Set location totalItems value
           */
          // const locationSource = item.location;

          // locationSource.totalItems -= 1;
          // locationsToEditTotalItems.push(item.location);

          let removeLocationLine = locationsToEditTotalItems.find(
            (line) => line.location.id === item.locationId,
          );

          if (!removeLocationLine) {
            removeLocationLine = {
              location: item.location,
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

          item.location = null;
          item.locationId = null;

          productItemsToUpdate.push(item);

          /**
           * Set product and variant quantities
           */

          const variantToUpdate = item.productVariant;
          const productToUpdate = variantToUpdate.product;

          let addedVariantLine = variantsToEditQuantities.find(
            (line) =>
              line.variant.id === variantToUpdate.id &&
              line.property === QuantityProprety.IN_TRANSIT,
          );

          if (!addedVariantLine) {
            addedVariantLine = {
              variant: variantToUpdate,
              quantity: 1,
              type: UpdatedType.ADD,
              property: QuantityProprety.IN_TRANSIT,
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
              line.property === QuantityProprety.RESERVED,
          );

          if (!removeVariantLine) {
            removeVariantLine = {
              variant: variantToUpdate,
              quantity: 1,
              type: UpdatedType.REMOVE,
              property: QuantityProprety.RESERVED,
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
              line.property === QuantityProprety.IN_TRANSIT,
          );

          if (!addedProductLine) {
            addedProductLine = {
              product: productToUpdate,
              quantity: 1,
              type: UpdatedType.ADD,
              property: QuantityProprety.IN_TRANSIT,
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
              line.property === QuantityProprety.RESERVED,
          );

          if (!removeProductLine) {
            removeProductLine = {
              product: productToUpdate,
              quantity: 1,
              type: UpdatedType.REMOVE,
              property: QuantityProprety.RESERVED,
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

          //Add
          // Variant
          // variantToUpdate.quantity.inTransit += 1;
          // variantToUpdate.quantity.reserved -= 1;

          // productToUpdate.quantity.inTransit += 1;
          // productToUpdate.quantity.reserved -= 1;

          // await this._locationRepository.save(locationSource);
          // await this._productVariantRepository.save(variantToUpdate);
          // await this._productRepository.save(productToUpdate);
        }
      }

      await this._productItemRepository.save(productItemsToUpdate);
      await this._mobileUnitRepository.save(mobileUnits);
      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._mobileUnitRepository.save(mobileUnitsToUpdate);

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

      /**
       * Build the output
       */
      const output = await this._transfertRepository.findOne(transfert.id, {
        relations: [
          'source',
          'target',
          'parent',
          'child',
          'order',
          'mobileUnits',
          'variantTransferts',
        ],
      });

      const mobileUnitsOutput: MobileUnit[] = [];

      await Promise.all(
        output.mobileUnits.map(async (mobileUnit) => {
          mobileUnit.productItems = await this._productItemRepository.find({
            where: { mobileUnitId: mobileUnit.id },
            relations: ['productVariant', 'location'],
          });

          mobileUnitsOutput.push(mobileUnit);
        }),
      );

      output.mobileUnits = mobileUnitsOutput;

      const variantsToTransfert: VariantsToTransfertModel[] = [];
      await Promise.all(
        output.variantTransferts.map(async (variantTransfert) => {
          const variant = await this._productVariantRepository.findOne(
            variantTransfert.variantId,
            { relations: ['product', 'attributeValues', 'productItems'] },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          variantsToTransfert.push({
            variantTransfert,
            variantDetails,
            locations,
          });
        }),
      );

      const mobileUnitModels: MobileUnitModel[] = [];

      if (output.mobileUnits && output.mobileUnits.length > 0) {
        await Promise.all(
          output.mobileUnits.map(async (mobileUnit) => {
            const mobileUnitModel =
              await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

            mobileUnitModels.push(mobileUnitModel);
          }),
        );
      }

      const transfertModel: TransfertModel = {
        transfert: output,
        mobileUnits: mobileUnitModels,
        variantsToTransfert,
      };

      /**
       * Send the mail here
       */
      const sendEmailTo: string[] = [];

      // const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      // console.log('AUTH ENDPOINT ', path);

      // await this._httpService.axiosRef
      //   .get(
      //     path +
      //       `?roles=${AgentRoles.WAREHOUSE_MANAGER}&roles=${AgentRoles.STOCK_AGENT}&roles=${AgentRoles.RECEIVER}&roles=${AgentRoles.EXPEDITION_SUPERVISOR}&roles=${AgentRoles.EXPEDITION_AGENT}&storagePointRef=${transfert.target.reference}`,
      //     {
      //       headers: {
      //         Authorization: `Bearer ${accessToken}`,
      //         'Accept-Encoding': 'gzip,deflate,compress',
      //       },
      //     },
      //   )
      //   .then((response) => {
      //     console.log(
      //       `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
      //       'Data ',
      //       response.data,
      //     );

      //     response.data.items.map((item) => {
      //       if (item) {
      //         sendEmailTo.push(item.email);
      //       }
      //     });
      //   })
      //   .catch((error) => {
      //     throw new HttpException(
      //       error.message,
      //       HttpStatus.INTERNAL_SERVER_ERROR,
      //     );
      //   });

      if (sendEmailTo.length > 0) {
        console.log(`Send mail to ${sendEmailTo}`);

        // const emailInput: EmailInputModel = {
        //   to: sendEmailTo,
        //   from: FROM_EMAIL,
        //   subject: `Transfert ${transfert.reference} from ${transfert.source.name} warehouse`,
        // };

        const context = new TransfertItemDetailsOutput(transfertModel, lang);

        // try {
        //   const send = await this._sendingEmailService.sendEmailWithTemplate(
        //     emailInput,
        //     EmailTemplateName.TRANSFERT,
        //     context,
        //   );
        //   if (send) {
        //     console.log('Mail sent successfully');
        //   }
        // } catch (error) {
        //   console.log(
        //     `Error sending email: ${error} - ${ValidateTransfertService.name} - ${this._tryExecution.name}`,
        //   );
        // }

        const data: EmailInputModelWithTemplate = {
          to: sendEmailTo,
          from: FROM_EMAIL,
          subject: `Transfert ${transfert.reference} from ${transfert.source.name} warehouse`,
          template: EmailTemplateName.TRANSFERT,
          context: context,
        };

        const job = await this._sendingEmailQueue.add(
          'email-with-template',
          data,
        );

        console.log('TEST JOB ================= ', job.id);
      }

      return new TransfertItemDetailsOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateTransfertService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: ValidateTransfertInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const transfert = await this._transfertRepository.findOne(
        input.transfertId,
        { relations: ['target', 'source', 'order', 'variantTransferts'] },
      );

      if (!transfert) {
        throw new NotFoundException(
          `Transfert you are trying to validate is not found`,
        );
      }

      /**
       * Restrictions
       */
      if (
        user.workStation?.warehouse &&
        user.workStation.warehouse.reference !== transfert.source.reference &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        )
      ) {
        throw new UnauthorizedException(
          `You cannot validate this transfert since you are not in ${transfert.source.name} warehouse`,
        );
      }

      /**
       * Can only validate CONFIRMED transfert
       */
      if (transfert.status !== TransfertStatus.CONFIRMED) {
        throw new BadRequestException(
          `You can only validate ${TransfertStatus.CONFIRMED} transfert`,
        );
      }

      /**
       * Mobile units validation
       */
      if (!input.mobileUnitIds || input.mobileUnitIds.length === 0) {
        throw new BadRequestException(`Please provide mobile units`);
      }

      let mobileUnits: MobileUnit[] = [];
      if (input.mobileUnitIds && input.mobileUnitIds.length > 0) {
        mobileUnits = await this._mobileUnitRepository.findByIds(
          input.mobileUnitIds,
          { relations: ['productItems'] },
        );

        if (mobileUnits.length < input.mobileUnitIds.length) {
          throw new NotFoundException(
            `Some mobile units are not found. Please check again`,
          );
        }

        const variantsTransferts = transfert.variantTransferts.filter(
          (transfertLine) =>
            transfertLine.state !== OperationLineState.CANCELED,
        );

        // console.log(variantsTransferts);

        /**
         * Check that all the variants to be transferred have their
         * items in the mobile units
         * and that each item has been picked
         */
        await Promise.all(
          variantsTransferts.map(async (variantToTransfert) => {
            const variant = await this._productVariantRepository.findOne(
              variantToTransfert.variantId,
            );

            // if (
            //   variantToTransfert.status === StatusLine.TO_PICK_PACK
            // ) {
            //   const message =
            //     variantToTransfert.pickedQuantity === 0
            //       ? variantToTransfert.quantity > 1
            //         ? `Products ${getLangOrFirstAvailableValue(
            //             variant.title,
            //             lang,
            //           )} are `
            //         : `The product ${getLangOrFirstAvailableValue(
            //             variant.title,
            //             lang,
            //           )} is`
            //       : `Some products ${getLangOrFirstAvailableValue(
            //           variant.title,
            //           lang,
            //         )} are `;
            //   throw new BadRequestException(`${message} not `);
            // }

            // Verifier que la ligne est bien VALIDATED
            if (variantToTransfert.state !== OperationLineState.VALIDATED) {
              throw new BadRequestException(
                `Cannot validate transfert with ${variantToTransfert.state} lines`,
              );
            }

            const variantItemsFoundInMobileUnits: ProductItem[] = [];
            mobileUnits.forEach((mobileUnit) => {
              mobileUnit.productItems.forEach((item) => {
                if (item.productVariantId === variant.id) {
                  variantItemsFoundInMobileUnits.push(item);
                }
              });
            });

            if (
              variantItemsFoundInMobileUnits.length <
              variantToTransfert.quantity
            ) {
              throw new BadRequestException(
                `Some items picked for ${getLangOrFirstAvailableValue(
                  variant.title,
                  lang,
                )} are missing in mobile units`,
              );
            }

            // if (
            //   variantItemsFoundInMobileUnits.length >
            //   variantToTransfert.quantity
            // ) {
            //   throw new BadRequestException(
            //     `Some items picked for ${getLangOrFirstAvailableValue(
            //       variant.title,
            //       lang,
            //     )} are in surplus in mobile units`,
            //   );
            // }

            if (
              variantItemsFoundInMobileUnits.some(
                (item) => item.status !== StepStatus.PICKED_UP,
              )
            ) {
              throw new BadRequestException(
                `Some items picked are not packed into any mobile unit. You can create a defaut mobile unit for unpacked items`,
              );
            }
          }),
        );
      }

      // throw new BadRequestException('work');

      return { transfert, mobileUnits, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateTransfertService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
