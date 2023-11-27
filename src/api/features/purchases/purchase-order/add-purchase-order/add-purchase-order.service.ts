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
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import { InternalNeed } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OperationLineState, OperationStatus } from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import { ProductVariantToPurchaseModel } from 'src/domain/interfaces/purchases';
import {
  PurchaseOrderModel,
  VariantsToPurchaseModel,
} from 'src/domain/types/purchases';
import { InternalNeedRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  SupplierRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { PurchaseOrderReferenceService } from 'src/services/references/purchases';
import { SharedService, UserService } from 'src/services/utilities';
import { AddPurchaseOrderInput } from './dto';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';
import { ProductVariantService } from 'src/services/generals';

type ValidationResult = {
  storagePoint: StoragePoint;
  order: Order;
  internalNeed: InternalNeed;
  assignTo?: MiniUserPayload;
  variantsToPurchase: ProductVariantToPurchaseModel[];
  comment: CommentModel;
  isOrder: boolean;
  isInternalNeed: boolean;
  isComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddPurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _purchaseOrderReferenceService: PurchaseOrderReferenceService,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _productVariantService: ProductVariantService,
    private readonly _userService: UserService,
  ) {}

  async addPurchaseOrder(
    input: AddPurchaseOrderInput,
    user: UserCon,
    accessToken: string,
  ): Promise<PurchaseOrderItemOutput> {
    const validationResult = await this._tryValidation(
      input,
      user,
      accessToken,
    );

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
    input: AddPurchaseOrderInput,
    result: ValidationResult,
  ): Promise<PurchaseOrderItemOutput> {
    const purchaseOrder = new PurchaseOrder();

    try {
      const {
        storagePoint,
        order,
        internalNeed,
        assignTo,
        variantsToPurchase,
        comment,
        isOrder,
        isInternalNeed,
        isComment,
        lang,
        user,
      } = result;

      purchaseOrder.reference =
        await this._purchaseOrderReferenceService.generate(
          purchaseOrder,
          false,
        );
      purchaseOrder.type = input.type;
      purchaseOrder.status = OperationStatus.PENDING;
      purchaseOrder.purchaseFor = input.purchaseFor;
      purchaseOrder.storagePoint = storagePoint;
      purchaseOrder.storagePointId = storagePoint.id;

      if (isOrder) {
        purchaseOrder.order = order;
        purchaseOrder.orderRef = order.reference;
      }

      if (isInternalNeed) {
        purchaseOrder.internalNeed = internalNeed;
      }

      if (!isNullOrWhiteSpace(input.orderRef)) {
        purchaseOrder.orderRef = input.orderRef;
      }

      if (!isNullOrWhiteSpace(input.assignTo)) {
        purchaseOrder.assignTo = input.assignTo;
        purchaseOrder.assignedTo = assignTo;
      }

      if (isComment) {
        purchaseOrder.comments = [comment];
      }

      purchaseOrder.createdBy = user;

      await this._purchaseOrderRepository.save(purchaseOrder);

      /**
       * Save variants to purchase
       * and build variantsToPurchaseModel
       */
      const productVariantsToPurchaseToAdd: VariantPurchased[] = [];
      const variantsToPurchaseModel: VariantsToPurchaseModel[] = [];
      let position = 0;

      for (const variantPurchaseItem of variantsToPurchase) {
        const {
          productVariant,
          quantity,
          purchaseCost,
          customPrice,
          supplier,
        } = variantPurchaseItem;

        const variantPurchased = new VariantPurchased();

        variantPurchased.position = position;
        variantPurchased.quantity = quantity;
        variantPurchased.state = OperationLineState.PENDING;
        variantPurchased.purchaseCost = purchaseCost;
        variantPurchased.customPrice = customPrice;

        variantPurchased.variant = productVariant;
        variantPurchased.variantId = productVariant.id;

        if (supplier) {
          variantPurchased.supplier = supplier;
          variantPurchased.supplierId = supplier.id;
        }

        variantPurchased.purchaseOrder = purchaseOrder;
        variantPurchased.purchaseOrderId = purchaseOrder.id;

        variantPurchased.createdBy = user;

        productVariantsToPurchaseToAdd.push(variantPurchased);

        position++;

        const variantDetails =
          await this._sharedService.buildPartialVariantOutput(productVariant);

        variantsToPurchaseModel.push({ variantPurchased, variantDetails });
      }

      await this._variantPurchasedRepository.save(
        productVariantsToPurchaseToAdd,
      );

      purchaseOrder.variantPurchaseds = productVariantsToPurchaseToAdd;

      await this._purchaseOrderRepository.save(purchaseOrder);

      const purchaseOrderModel: PurchaseOrderModel = {
        purchaseOrder,
        variantsToPurchase: variantsToPurchaseModel,
      };

      return new PurchaseOrderItemOutput(purchaseOrderModel, lang);
    } catch (error) {
      console.log(error);

      if (purchaseOrder.id) {
        await this._purchaseOrderRepository.delete(purchaseOrder.id);
      }
      throw new ConflictException(
        `${AddPurchaseOrderService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddPurchaseOrderInput,
    user: UserCon,
    accessToken: string,
  ): Promise<ValidationResult> {
    try {
      // Privileges validation
      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.WAREHOUSE_MANAGER ||
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.PROCUREMENT_ASSISTANT ||
            role === AgentRoles.PROCUREMENT_SUPPLY,
        )
      ) {
        throw new UnauthorizedException(
          `You are not allowed to create a purchase order`,
        );
      }

      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the warehouse where the delivery will take place
       */
      const storagePoint = await this._storagePointRepository.findOne(
        input.storagePointId,
      );
      if (!storagePoint) {
        throw new NotFoundException(
          `The warehouse where the delivery will take place not found.`,
        );
      }

      /**
       * Get Order or internalNeed if provide
       */
      let order: Order;
      let internalNeed: InternalNeed;

      if (!isNullOrWhiteSpace(input.orderId)) {
        order = await this._orderRepository.findOne(input.orderId);
        if (!order) {
          throw new NotFoundException(`Order not found.`);
        }
      }

      if (!isNullOrWhiteSpace(input.internalNeedId)) {
        internalNeed = await this._internalNeedRepository.findOne(
          input.internalNeedId,
        );
        if (!internalNeed) {
          throw new NotFoundException(`InternalNeed not found.`);
        }
      }

      /**
       * Get the purchase agent if exist
       */
      let assignTo: MiniUserPayload;

      if (!isNullOrWhiteSpace(input.assignTo)) {
        // Get the user from auth microservice
        const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
        console.log('AUTH ENDPOINT ', path);

        await this._httpService.axiosRef
          .get(path + `/${input.assignTo}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          })
          .then((response) => {
            console.log(
              `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
              'Data ',
              response.data,
            );

            assignTo = {
              firstname: response.data.firstname
                ? response.data.firstname
                : null,
              lastname: response.data.lastname,
              email: response.data.email,
            };
          })
          .catch((error) => {
            throw new HttpException(
              error.message,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          });
      }

      /**
       * Variants to purchase validation
       * Build model
       */
      const variantsToPurchase: ProductVariantToPurchaseModel[] = [];

      if (input.variantsToPurchase && input.variantsToPurchase.length > 0) {
        await Promise.all(
          input.variantsToPurchase.map(async (variantToPurchase) => {
            const { variantId, quantity, customPrice, supplierId } =
              variantToPurchase;

            const productVariant = await this._productVariantRepository.findOne(
              variantId,
              { relations: ['product', 'attributeValues', 'children'] },
            );
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
                } product. You cannot add it to a purchase order`,
              );
            }

            let supplier: Supplier;
            if (!isNullOrWhiteSpace(supplierId)) {
              supplier = await this._supplierRepository.findOne(supplierId);
              if (!supplier) {
                throw new NotFoundException(
                  `Supplier with id ${supplierId} not found`,
                );
              }
            }

            if (Number.isNaN(quantity) || quantity <= 0) {
              throw new HttpException(
                `Invalid fields: quantity ${quantity}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            // if (Number.isNaN(purchaseCost) || purchaseCost < 0) {
            //   throw new HttpException(
            //     `Invalid fields: price ${purchaseCost}`,
            //     HttpStatus.BAD_REQUEST,
            //   );
            // }

            if (Number.isNaN(customPrice) || customPrice < 0) {
              throw new HttpException(
                `Invalid fields: sale price ${customPrice}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            const variantToPurchaseItem: ProductVariantToPurchaseModel = {
              productVariant,
              quantity,
              purchaseCost: productVariant.purchaseCost,
              customPrice,
              supplier,
            };
            variantsToPurchase.push(variantToPurchaseItem);
          }),
        );
      }

      /**
       * Add variantsToPurchase from customProducts if provided
       */
      if (input.customProducts && input.customProducts.length > 0) {
        const newCustomProducts =
          await this._productVariantService.createCustomProducts(
            input.customProducts,
            lang,
            user,
          );

        if (newCustomProducts.length > 0) {
          newCustomProducts.map((newCustomProduct) => {
            const { product, variant, supplier, quantity } = newCustomProduct;

            variantsToPurchase.push({
              productVariant: variant,
              quantity,
              purchaseCost: variant.purchaseCost,
              customPrice: null,
              supplier,
            });
          });
        }
      }

      let comment: CommentModel;
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comment = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };
      }

      return {
        storagePoint,
        order,
        internalNeed,
        assignTo,
        variantsToPurchase,
        comment,
        isOrder: !!order,
        isInternalNeed: !!internalNeed,
        isComment: !!comment,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${AddPurchaseOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
