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
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { TransfertItemOutput } from 'src/domain/dto/flows/transfert-item-output.dto';
import {
  OrderProcessing,
  Transfert,
  VariantTransfert,
} from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationLineState,
  OperationStatus,
  StatusLine,
  StepStatus,
  TransfertStatus,
  TransfertType,
} from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import {
  CommentModel,
  ProductVariantToTransfertModel,
} from 'src/domain/interfaces';
import {
  TransfertModel,
  VariantsToTransfertModel,
} from 'src/domain/types/flows';
import {
  OrderProcessingRepository,
  TransfertRepository,
  VariantTransfertRepository,
} from 'src/repositories/flows';
import {
  AttributeRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { TransfertService } from 'src/services/references/flows';
import { SharedService, UserService } from 'src/services/utilities';
import { AddTransfertInput } from './dto';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { AvailabilityStatus, OrderStep } from 'src/domain/enums/orders';
import { PurchaseOrder, VariantPurchased } from 'src/domain/entities/purchases';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { OrderService } from 'src/services/generals';
import { ArticlesOrderedType } from 'src/domain/types/orders';
import { OrderReferenceService } from 'src/services/references/orders';

type ValidationResult = {
  source: StoragePoint;
  target: StoragePoint;
  variantsToTransfert: ProductVariantToTransfertModel[];
  order: Order;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddTransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(VariantTransfert)
    private readonly _variantTransfertRepository: VariantTransfertRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _transfertReferenceService: TransfertService,
    private readonly _sharedService: SharedService,
    private readonly _userService: UserService,
    private readonly _orderService: OrderService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async addTransfert(
    input: AddTransfertInput,
    user: UserCon,
  ): Promise<TransfertItemOutput> {
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
    input: AddTransfertInput,
    result: ValidationResult,
  ): Promise<TransfertItemOutput> {
    const transfert = new Transfert();

    try {
      const { source, target, variantsToTransfert, order, lang, user } = result;

      transfert.reference =
        await this._transfertReferenceService.generateReference();
      if (order) {
        transfert.type = TransfertType.ORDER;
        transfert.order = order;
        transfert.orderId = order.id;

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

        /**
         * Change the order status and state
         */
        order.orderStatus = StepStatus.TO_TRANSFER;
        order.orderStep = OrderStep.TRANSFER_IN_PROGRESS;

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
        transfert.type = TransfertType.MANUAL;
      }

      transfert.status =
        input.isRequest ||
        user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
        )
          ? TransfertStatus.PENDING
          : TransfertStatus.CONFIRMED;
      transfert.description = input.description;
      transfert.isRequest = input.isRequest;

      transfert.source = source;
      transfert.sourceId = source.id;

      transfert.target = target;
      transfert.targetId = target.id;

      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        const comment: CommentModel = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };

        transfert.comments = [comment];
      }

      transfert.createdBy = user;
      transfert.confirmedBy = !input.isRequest ? user : null;
      transfert.confirmedAt = !input.isRequest ? new Date() : null;

      await this._transfertRepository.save(transfert);

      /**
       * Save variants to transfert
       * and build variantsToTransfertModel
       */
      const productVariantsToTransfertToAdd: VariantTransfert[] = [];
      const variantsToTransfertModel: VariantsToTransfertModel[] = [];
      let position = 0;

      variantsToTransfert.map(async (variantTransfertItem) => {
        const { productVariant, quantity } = variantTransfertItem;

        const variantTransfert = new VariantTransfert();

        variantTransfert.position = position;
        variantTransfert.variant = productVariant;
        variantTransfert.variantId = productVariant.id;

        variantTransfert.transfert = transfert;
        variantTransfert.transfertId = transfert.id;

        variantTransfert.quantity = quantity;
        variantTransfert.pickedQuantity = 0;
        variantTransfert.status = StatusLine.TO_PICK_PACK;

        variantTransfert.state =
          transfert.status === TransfertStatus.CONFIRMED
            ? OperationLineState.VALIDATED
            : OperationLineState.PENDING;

        variantTransfert.createdBy = user;

        productVariantsToTransfertToAdd.push(variantTransfert);

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(productVariant);

        const locations =
          await this._sharedService.buildPickPackLocationsOutput(
            productVariant,
          );

        variantsToTransfertModel.push({
          variantTransfert,
          variantDetails,
          locations,
        });
        position++;
      });

      await this._variantTransfertRepository.save(
        productVariantsToTransfertToAdd,
      );

      transfert.variantTransferts = productVariantsToTransfertToAdd;

      await this._transfertRepository.save(transfert);

      if (order && transfert.status === TransfertStatus.CONFIRMED) {
        const purchaseOrder = await this._purchaseOrderRepository.findOne({
          where: { id: order.purchaseOrder.id },
          relations: ['variantPurchaseds'],
        });

        if (purchaseOrder) {
          const articleOrderedsType: ArticlesOrderedType[] = [];

          if (order.articleOrdereds && order.articleOrdereds.length > 0) {
            for (const articleOrdered of order.articleOrdereds) {
              const article = await this._productVariantRepository.findOne({
                where: { id: articleOrdered.productVariantId },
              });

              if (!article) {
                continue;
              }

              const articleOrderedType: ArticlesOrderedType = {
                articleRef: article.reference,
                quantity: articleOrdered.quantity,
              };

              articleOrderedsType.push(articleOrderedType);
            }
          }

          const variantsAvailabilities =
            await this._orderService.checkVariantsAvailabilities(
              order.type,
              target,
              articleOrderedsType,
            );

          if (variantsAvailabilities.status === AvailabilityStatus.ALL) {
            purchaseOrder.status = OperationStatus.CANCELED;
            purchaseOrder.canceledBy = user;
            purchaseOrder.canceledAt = new Date();

            await this._purchaseOrderRepository.save(purchaseOrder);
          } else {
            const variantsToPurshase: VariantPurchased[] = [];

            purchaseOrder.variantPurchaseds.forEach((variantPurchased) => {
              const variantAvailability =
                variantsAvailabilities.availabilities.find(
                  (availability) =>
                    availability.missingQty > 0 &&
                    availability.variant.id === variantPurchased.variantId &&
                    !availability.localisations.find(
                      (location) => location.storagePoint.id === target.id,
                    ),
                );

              if (variantAvailability) {
                const variantToPurchase = variantPurchased;
                variantToPurchase.quantity = variantAvailability.missingQty;

                variantsToPurshase.push(variantToPurchase);
              }
            });

            purchaseOrder.status = OperationStatus.PENDING;
            purchaseOrder.storagePoint = target;
            purchaseOrder.storagePointId = target.id;
            purchaseOrder.variantPurchaseds = variantsToPurshase;
            purchaseOrder.transfert = transfert;

            await this._purchaseOrderRepository.save(purchaseOrder);

            transfert.status = TransfertStatus.AWAITING_PURCHASE;

            await this._transfertRepository.save(transfert);
          }
        }
      }

      /**
       * Build the output
       */
      const transfertModel: TransfertModel = {
        transfert,
        variantsToTransfert: variantsToTransfertModel,
      };

      return new TransfertItemOutput(transfertModel, lang);
    } catch (error) {
      console.log(error);

      if (transfert?.id) {
        await this._transfertRepository.delete(transfert.id);
      }
      throw new ConflictException(
        `${AddTransfertService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddTransfertInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      /**
       * Get source and target storage-points
       */
      const source = await this._storagePointRepository.findOne({
        where: { id: input.sourceId },
      });
      if (!source) {
        throw new NotFoundException(`Source storage-point not found.`);
      }

      const target = await this._storagePointRepository.findOne({
        where: { id: input.targetId },
      });
      if (!target) {
        throw new NotFoundException(`Target storage-point not found.`);
      }

      /**
       * If isRequest = true : is user in target storage-point ?
       * else : is user in source storage-point ?
       */
      //TODO:
      if (input.isRequest) {
        const isUserInTargetOrAdmin =
          user.roles.some(
            (role) =>
              role === AgentRoles.SUPER_ADMIN ||
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.LOGISTIC_MANAGER,
          ) ||
          (user.workStation?.warehouse?.reference === target.reference &&
            user.roles.some(
              (role) =>
                role === AgentRoles.STOCK_AGENT ||
                role === AgentRoles.EXPEDITION_SUPERVISOR ||
                role === AgentRoles.EXPEDITION_AGENT ||
                role === AgentRoles.FLEET_SUPERVISOR,
            ));

        if (!isUserInTargetOrAdmin) {
          throw new UnauthorizedException(
            `You cannot request for a transfert since you are not a ${
              AgentRoles.SUPER_ADMIN
            } or you are not a ${
              AgentRoles.WAREHOUSE_MANAGER +
              ' or ' +
              AgentRoles.STOCK_AGENT +
              ' or ' +
              AgentRoles.FLEET_SUPERVISOR
            } of ${target.name} storage-point`,
          );
        }
      } else {
        const isUserInSourceOrAdmin =
          user.roles.some(
            (role) =>
              role === AgentRoles.SUPER_ADMIN ||
              role === AgentRoles.WAREHOUSE_MANAGER ||
              role === AgentRoles.LOGISTIC_MANAGER,
          ) ||
          (user.workStation?.warehouse?.reference === source.reference &&
            user.roles.some(
              (role) =>
                role === AgentRoles.EXPEDITION_SUPERVISOR ||
                role === AgentRoles.STOCK_AGENT ||
                role === AgentRoles.EXPEDITION_AGENT,
            ));

        if (!isUserInSourceOrAdmin) {
          throw new UnauthorizedException(
            `You cannot create a transfert since you are not a ${
              AgentRoles.SUPER_ADMIN
            } or you are not a ${
              AgentRoles.WAREHOUSE_MANAGER + ' or ' + AgentRoles.STOCK_AGENT
            } of ${source.name} storage-point`,
          );
        }

        /**
         * Check if product-variants added on transfert
         * are all in stock in the source storage-point
         */
      }

      /**
       * variants to transfert validation
       * and model built
       */
      const variantsToTransfert: ProductVariantToTransfertModel[] = [];

      await Promise.all(
        input.variantsToTransfert.map(async (variantToTransfert) => {
          const { variantId, quantity } = variantToTransfert;

          const productVariant = await this._productVariantRepository.findOne({
            where: { id: variantId },
            relations: [
              'product',
              'attributeValues',
              'productItems',
              'children',
            ],
          });
          if (!productVariant) {
            throw new NotFoundException(
              `Product variant with id ${variantId} not found`,
            );
          }

          if (productVariant.product.productType !== ProductType.SIMPLE) {
            throw new BadRequestException(
              `${getLangOrFirstAvailableValue(
                productVariant.title,
                ISOLang.FR,
              )} is a ${
                productVariant.product.productType
              } product. You cannot add it to a transfert`,
            );
          }

          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new HttpException(
              `Invalid fields: quantity ${quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          await Promise.all(
            productVariant.attributeValues?.map(async (attributeValue) => {
              attributeValue.attribute =
                await this._attributeRepository.findOne({
                  where: { id: attributeValue.attributeId },
                  relations: ['units', 'definedAttributeValues'],
                });

              await Promise.all(
                attributeValue.attribute.definedAttributeValues?.map(
                  async (definedValue) => {
                    definedValue.unit = await this._unitRepository.findOne({
                      where: { id: definedValue.unitId },
                    });
                  },
                ),
              );

              attributeValue.unit = await this._unitRepository.findOne({
                where: { id: attributeValue.unitId },
              });

              return attributeValue;
            }),
          );

          const variantToTransfertItem: ProductVariantToTransfertModel = {
            productVariant,
            quantity,
          };

          variantsToTransfert.push(variantToTransfertItem);
        }),
      );

      let order: Order;

      if (input.orderReference && !isNullOrWhiteSpace(input.orderReference)) {
        order = await this._orderRepository.findOne({
          where: { reference: input.orderReference },
          relations: ['purchaseOrder', 'articleOrdereds'],
        });
        if (!order) {
          throw new NotFoundException(
            `The order of reference ${input.orderReference} does not exist`,
          );
        }
      }

      return { source, target, variantsToTransfert, order, lang, user };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddTransfertService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
