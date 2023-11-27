import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import { ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import {
  PurchaseOrder,
  Supplier,
  VariantPurchased,
} from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { OperationStatus, StepStatus } from 'src/domain/enums/flows';
import { OrderStep } from 'src/domain/enums/orders';
import {
  PurchaseOrderFor,
  PurchaseStatusLine,
  PurchaseType,
} from 'src/domain/enums/purchases';
import { VariantPurchasedToEditModel } from 'src/domain/interfaces/purchases';
import {
  PurchaseOrderModel,
  VariantsToPurchaseModel,
} from 'src/domain/types/purchases';
import { ProductVariantRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import {
  PurchaseOrderRepository,
  SupplierRepository,
  VariantPurchasedRepository,
} from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';
import { EditPurchaseOrderInput } from './dto';
import { CommentModel, MiniUserPayload } from 'src/domain/interfaces';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';
import { PurchaseOrderService } from 'src/services/generals';

type ValidationResult = {
  purchaseOrder: PurchaseOrder;
  type: PurchaseType;
  purchaseFor: PurchaseOrderFor;
  storagePoint: StoragePoint;
  assignTo?: MiniUserPayload;
  agentId?: string;
  variantsPurchasedToEdit: VariantPurchasedToEditModel[];
  comments: CommentModel[];
  isStoragePointChange: boolean;
  isType: boolean;
  isPurchaseFor: boolean;
  isNewComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditPurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(VariantPurchased)
    private readonly _variantPurchasedRepository: VariantPurchasedRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _purchaseOrderService: PurchaseOrderService,
  ) {}

  async editPurchaseOrder(
    input: EditPurchaseOrderInput,
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
  ): Promise<PurchaseOrderItemOutput> {
    try {
      const {
        purchaseOrder,
        type,
        purchaseFor,
        storagePoint,
        assignTo,
        agentId,
        variantsPurchasedToEdit,
        comments,
        isStoragePointChange,
        isType,
        isPurchaseFor,
        isNewComment,
        lang,
        user,
      } = result;

      if (isStoragePointChange) {
        purchaseOrder.storagePointId = storagePoint.id;
        purchaseOrder.storagePoint = storagePoint;
      }

      if (isType) {
        purchaseOrder.type = type;
      }

      if (isPurchaseFor) {
        purchaseOrder.purchaseFor = purchaseFor;
      }

      if (!!assignTo) {
        purchaseOrder.assignTo = agentId;
        purchaseOrder.assignedTo = assignTo;
      }

      if (isNewComment) {
        purchaseOrder.comments = comments;
      }

      if (variantsPurchasedToEdit.length > 0) {
        const variantsPurchasedToUpdate: VariantPurchased[] = [];

        variantsPurchasedToEdit.map((variantPurchasedToEdit) => {
          const {
            variantPurchased,
            purchaseCost,
            realCost,
            customPrice,
            supplier,
            status,
            comment,
          } = variantPurchasedToEdit;

          if (purchaseCost) {
            variantPurchased.purchaseCost = purchaseCost;
          }

          if (realCost) {
            variantPurchased.realCost = realCost;
          } else if (variantPurchased.realCost) {
            variantPurchased.realCost = null;
          }

          if (customPrice) {
            variantPurchased.customPrice = customPrice;
          }

          if (supplier) {
            variantPurchased.supplier = supplier;
            variantPurchased.supplierId = supplier.id;
          }

          if (status && !isNullOrWhiteSpace(status)) {
            variantPurchased.status = status;
          } else if (variantPurchased.status) {
            variantPurchased.status = null;
          }

          if (!!comment) {
            variantPurchased.comment = comment;
          } else if (variantPurchased.comment) {
            variantPurchased.comment = null;
          }

          variantPurchased.updatedBy = user;

          variantsPurchasedToUpdate.push(variantPurchased);
        });

        await this._variantPurchasedRepository.save(variantsPurchasedToUpdate);
      }

      /**
       * Check purchase order lines status
       * 1. Si au moins une ligne est SELLER_DELAY | OUT_OF_STOCK | PRICE_ISSUE
       * ******* set orderStatus = INFO_CLIENT
       * ******* set orderStep = VERIFICATION_IN_PROGRESS
       */

      if (purchaseOrder.order) {
        const order = await this._orderRepository.findOneOrFail(
          purchaseOrder.order.id,
        );

        const variantsPurchased = await this._variantPurchasedRepository.find({
          where: { purchaseOrderId: purchaseOrder.id },
          relations: ['supplier'],
        });

        if (
          variantsPurchased?.some(
            (variantPurchased) =>
              variantPurchased.status === PurchaseStatusLine.SELLER_DELAY ||
              variantPurchased.status === PurchaseStatusLine.OUT_OF_STOCK ||
              variantPurchased.status === PurchaseStatusLine.PRICE_ISSUE ||
              variantPurchased.status === PurchaseStatusLine.AWAITING_CATMAN ||
              variantPurchased.status === PurchaseStatusLine.NOT_BOUGHT,
          )
        ) {
          order.orderStatus = StepStatus.INFO_CLIENT;
          order.orderStep = OrderStep.VERIFICATION_IN_PROGRESS;
        }

        await this._orderRepository.save(order);
      }

      purchaseOrder.updatedBy = user;

      // if (!variantsPurchasedToEdit?.some(variantPurchasedToEdit => variantPurchasedToEdit.status === StatusLine.SELLER_DELAY || variantPurchasedToEdit.status === StatusLine.OUT_OF_STOCK || variantPurchasedToEdit.status === StatusLine.PRICE_ISSUE)) {
      //   purchaseOrder.status = OperationStatus.SAVED;
      // }
      if (variantsPurchasedToEdit && variantsPurchasedToEdit.length > 0) {
        purchaseOrder.status = OperationStatus.SAVED;
      }

      await this._purchaseOrderRepository.save(purchaseOrder);

      /**
       * Build the output
       */
      const output = await this._purchaseOrderRepository.findOne(
        purchaseOrder.id,
        {
          relations: [
            'variantPurchaseds',
            'parent',
            'child',
            'order',
            'storagePoint',
            'internalNeed',
            'receptions',
          ],
        },
      );

      const variantsToPurchase: VariantsToPurchaseModel[] = [];

      await Promise.all(
        output.variantPurchaseds.map(async (variantPurchased) => {
          const variant = await this._productVariantRepository.findOne(
            variantPurchased.variantId,
            {
              relations: ['product', 'attributeValues', 'children'],
            },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          variantPurchased.supplier = await this._supplierRepository.findOne({
            where: { id: variantPurchased.supplierId },
          });

          variantsToPurchase.push({ variantPurchased, variantDetails });
        }),
      );

      const purchaseOrderModel: PurchaseOrderModel = {
        purchaseOrder: output,
        variantsToPurchase,
      };

      return new PurchaseOrderItemOutput(purchaseOrderModel, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${EditPurchaseOrderService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditPurchaseOrderInput,
    user: UserCon,
    accessToken: string,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get purchase to edit
       */
      const purchaseOrder = await this._purchaseOrderRepository.findOne(
        input.purchaseOrderId,
        {
          relations: [
            'variantPurchaseds',
            'parent',
            'child',
            'order',
            'storagePoint',
            'internalNeed',
            'receptions',
          ],
        },
      );

      if (!purchaseOrder) {
        throw new NotFoundException(
          `Purchase order you are trying to edit is not found`,
        );
      }

      /**
       * Can only edit PENDING and SAVED purchase order
       */
      if (
        purchaseOrder.status !== OperationStatus.PENDING &&
        purchaseOrder.status !== OperationStatus.SAVED
      ) {
        throw new BadRequestException(
          `Sorry, you cannot edit ${purchaseOrder.status} purchase order.`,
        );
      }

      let storagePoint: StoragePoint;

      if (!isNullOrWhiteSpace(input.storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne(
          input.storagePointId,
        );

        if (!storagePoint) {
          throw new NotFoundException(
            `Storage point you are trying to add is not found`,
          );
        }
      }

      const variantsPurchasedToEdit: VariantPurchasedToEditModel[] = [];

      if (
        input.variantsPurchasedToEdit &&
        input.variantsPurchasedToEdit.length > 0
      ) {
        await Promise.all(
          input.variantsPurchasedToEdit.map(async (variantPurchasedToEdit) => {
            const {
              variantPurchasedId,
              purchaseCost,
              realCost,
              customPrice,
              supplierId,
              status,
              comment,
            } = variantPurchasedToEdit;

            const variantPurchased =
              await this._variantPurchasedRepository.findOneOrFail(
                variantPurchasedId,
              );

            if (
              status &&
              status !== PurchaseStatusLine.OUT_OF_STOCK &&
              status !== PurchaseStatusLine.PRICE_ISSUE &&
              status !== PurchaseStatusLine.SELLER_DELAY &&
              status !== PurchaseStatusLine.AWAITING_CATMAN &&
              status !== PurchaseStatusLine.NOT_BOUGHT
            ) {
              throw new BadRequestException(
                `Invalid status input. Please choose among ${PurchaseStatusLine.OUT_OF_STOCK}, ${PurchaseStatusLine.PRICE_ISSUE}, ${PurchaseStatusLine.SELLER_DELAY}, ${PurchaseStatusLine.AWAITING_CATMAN} and ${PurchaseStatusLine.NOT_BOUGHT}`,
              );
            }

            if (
              status &&
              status === PurchaseStatusLine.PRICE_ISSUE &&
              !realCost
            ) {
              throw new BadRequestException(
                `Please provide ${getLangOrFirstAvailableValue(
                  variantPurchased.variant.title,
                  lang,
                )} real cost. Since the problem is ${status}`,
              );
            }

            if (
              purchaseCost &&
              (Number.isNaN(purchaseCost) || purchaseCost < 0)
            ) {
              throw new HttpException(
                `Invalid fields: purchaseCost ${purchaseCost}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            if (realCost && (Number.isNaN(realCost) || realCost <= 0)) {
              throw new HttpException(
                `Invalid fields: realCost ${realCost}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            if (
              customPrice &&
              (Number.isNaN(customPrice) || customPrice <= 0)
            ) {
              throw new HttpException(
                `Invalid fields: customPrice ${customPrice}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            let supplier: Supplier;

            if (!isNullOrWhiteSpace(supplierId)) {
              supplier = await this._supplierRepository.findOneOrFail(
                supplierId,
              );
            }

            if (
              status &&
              (status === PurchaseStatusLine.SELLER_DELAY ||
                status === PurchaseStatusLine.PRICE_ISSUE ||
                status === PurchaseStatusLine.AWAITING_CATMAN ||
                status === PurchaseStatusLine.NOT_BOUGHT) &&
              !comment
            ) {
              throw new BadRequestException(
                `Please comment is required for ${PurchaseStatusLine.SELLER_DELAY}, ${PurchaseStatusLine.PRICE_ISSUE}, ${PurchaseStatusLine.AWAITING_CATMAN} and ${PurchaseStatusLine.NOT_BOUGHT}`,
              );
            }

            variantsPurchasedToEdit.push({
              variantPurchased,
              purchaseCost,
              realCost,
              customPrice,
              supplier,
              status,
              comment,
            });
          }),
        );
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

      let comments: CommentModel[] = [];
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comments = this._purchaseOrderService.buildOrderComments(
          purchaseOrder,
          input.comment,
          user,
        );
      }

      return {
        purchaseOrder,
        type: input.type,
        purchaseFor: input.purchaseFor,
        storagePoint,
        assignTo,
        agentId: input.assignTo,
        variantsPurchasedToEdit,
        comments,
        isStoragePointChange: !!storagePoint,
        isType: !!input.type,
        isPurchaseFor: !!input.purchaseFor,
        isNewComment: !!input.comment && !isNullOrWhiteSpace(input.comment),
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditPurchaseOrderService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
