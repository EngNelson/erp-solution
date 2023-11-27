import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CustomerReturn,
  InternalNeed,
  OtherOutput,
  Reception,
  Transfert,
} from 'src/domain/entities/flows';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  CustomerReturnState,
  InternalNeedStatus,
  OperationStatus,
  OutputStatus,
  OutputType,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import { PurchaseOrderType } from 'src/domain/enums/purchases';
import {
  InputAmountOutput,
  OtherOutputModel,
  OutputAmountOutput,
  StockValueModel,
  TotalPurchase,
  TotalTransfert,
} from 'src/domain/interfaces/analytics';
import {
  CustomerReturnRepository,
  InternalNeedRepository,
  OtherOutputRepository,
  ReceptionRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { Between, In, LessThanOrEqual, Like, MoreThanOrEqual } from 'typeorm';
import { GetWarehouseResumeInput, GetWarehouseResumeOutput } from './dto';
import { ItemState } from 'src/domain/enums/items';

type ValidationResult = {
  storagePoint: StoragePoint;
  isStoragePoint: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetWarehouseResumeService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
  ) {}

  async getWarehouseResume(
    input: GetWarehouseResumeInput,
    user: UserCon,
  ): Promise<GetWarehouseResumeOutput> {
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
    input: GetWarehouseResumeInput,
    result: ValidationResult,
  ): Promise<GetWarehouseResumeOutput> {
    try {
      const { storagePoint, isStoragePoint, lang, user } = result;
      const {
        startDate,
        endDate,
        specificDate,
        purchaseOrderType,
        transfertStatus,
        ...data
      } = input;

      let productItems: ProductItem[] = [];
      const productVariants: ProductVariant[] = [];
      let purchaseOrders: PurchaseOrder[] = [];
      const stockPurchaseOrders: PurchaseOrder[] = [];
      const orderPurchaseOrders: PurchaseOrder[] = [];
      let transferts: Transfert[] = [];
      let otherOutputs: OtherOutput[] = [];
      let internalNeeds: InternalNeed[] = [];
      let transfertsOut: Transfert[] = [];
      let orders: Order[] = [];
      let receptions: Reception[] = [];
      let transfertsIn: Transfert[] = [];
      let customerReturns: CustomerReturn[] = [];

      if (isStoragePoint) {
        const areas = await this._areaRepository.find({
          where: { storagePointId: storagePoint.id },
          relations: ['locations'],
        });

        const locations: Location[] = [];

        await Promise.all(
          areas.map(async (area) => {
            await Promise.all(
              area.locations.map(async (loc) => {
                const children =
                  await this._locationTreeRepository.findDescendants(loc);
                locations.push(...children);

                if (!locations.find((location) => location.id === loc.id)) {
                  locations.push(loc);
                }
              }),
            );
          }),
        );

        const locationIds: string[] = [];

        if (locations.length > 0) {
          locations.forEach((location) => locationIds.push(location.id));
        }

        if (startDate && endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              locationId: In(locationIds),
              createdAt: Between(startDate, endDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: Between(startDate, endDate),
                    },
                    {
                      targetId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: Between(startDate, endDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      validatedAt: Between(startDate, endDate),
                    },
                    {
                      targetId: storagePoint.id,
                      validatedAt: Between(startDate, endDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OutputStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: InternalNeedStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              sourceId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              orderStatus: StepStatus.COMPLETE,
              cashedAt: Between(startDate, endDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OperationStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              targetId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              storagePointId: storagePoint.id,
              state: CustomerReturnState.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['productItems'],
          });
        } else if (startDate && !endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              locationId: In(locationIds),
              createdAt: MoreThanOrEqual(startDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: MoreThanOrEqual(startDate),
                    },
                    {
                      targetId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: MoreThanOrEqual(startDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      validatedAt: MoreThanOrEqual(startDate),
                    },
                    {
                      targetId: storagePoint.id,
                      validatedAt: MoreThanOrEqual(startDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OutputStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: InternalNeedStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              sourceId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              orderStatus: StepStatus.COMPLETE,
              cashedAt: MoreThanOrEqual(startDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OperationStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              targetId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              storagePointId: storagePoint.id,
              state: CustomerReturnState.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['productItems'],
          });
        } else if (!startDate && endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              locationId: In(locationIds),
              createdAt: LessThanOrEqual(endDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: LessThanOrEqual(endDate),
                    },
                    {
                      targetId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: LessThanOrEqual(endDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      validatedAt: LessThanOrEqual(endDate),
                    },
                    {
                      targetId: storagePoint.id,
                      validatedAt: LessThanOrEqual(endDate),
                    },
                  ],
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OutputStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: InternalNeedStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              sourceId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              orderStatus: StepStatus.COMPLETE,
              cashedAt: LessThanOrEqual(endDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OperationStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              targetId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              storagePointId: storagePoint.id,
              state: CustomerReturnState.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['productItems'],
          });
        } else if (specificDate) {
          productItems = await this._productItemRepository.find({
            where: {
              locationId: In(locationIds),
              createdAt: Like(`${specificDate}%`),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: Like(`${specificDate}%`),
                    },
                    {
                      targetId: storagePoint.id,
                      status: transfertStatus,
                      validatedAt: Like(`${specificDate}%`),
                    },
                  ],
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                      validatedAt: Like(`${specificDate}%`),
                    },
                    {
                      targetId: storagePoint.id,
                      validatedAt: Like(`${specificDate}%`),
                    },
                  ],
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OutputStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: InternalNeedStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              sourceId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              orderStatus: StepStatus.COMPLETE,
              cashedAt: Like(`${specificDate}%`),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OperationStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              targetId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              storagePointId: storagePoint.id,
              state: CustomerReturnState.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['productItems'],
          });
        } else {
          productItems = await this._productItemRepository.find({
            where: { locationId: In(locationIds) },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              storagePointId: storagePoint.id,
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: [
                    {
                      status: transfertStatus,
                      sourceId: storagePoint.id,
                    },
                    {
                      status: transfertStatus,
                      targetId: storagePoint.id,
                    },
                  ],
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: [
                    {
                      sourceId: storagePoint.id,
                    },
                    {
                      targetId: storagePoint.id,
                    },
                  ],
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OutputStatus.VALIDATED,
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: InternalNeedStatus.VALIDATED,
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              sourceId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              storagePointId: storagePoint.id,
              orderStatus: StepStatus.COMPLETE,
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              storagePointId: storagePoint.id,
              status: OperationStatus.VALIDATED,
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              targetId: storagePoint.id,
              status: TransfertStatus.VALIDATED,
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              storagePointId: storagePoint.id,
              state: CustomerReturnState.VALIDATED,
            },
            relations: ['productItems'],
          });
        }
      } else {
        if (startDate && endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              createdAt: Between(startDate, endDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: {
                    status: transfertStatus,
                    validatedAt: Between(startDate, endDate),
                  },
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: {
                    validatedAt: Between(startDate, endDate),
                  },
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              status: OutputStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              status: InternalNeedStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              orderStatus: StepStatus.COMPLETE,
              cashedAt: Between(startDate, endDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              status: OperationStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              state: CustomerReturnState.VALIDATED,
              validatedAt: Between(startDate, endDate),
            },
            relations: ['productItems'],
          });
        } else if (startDate && !endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              createdAt: MoreThanOrEqual(startDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: {
                    status: transfertStatus,
                    validatedAt: MoreThanOrEqual(startDate),
                  },
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: {
                    validatedAt: MoreThanOrEqual(startDate),
                  },
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              status: OutputStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              status: InternalNeedStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              orderStatus: StepStatus.COMPLETE,
              cashedAt: MoreThanOrEqual(startDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              status: OperationStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              state: CustomerReturnState.VALIDATED,
              validatedAt: MoreThanOrEqual(startDate),
            },
            relations: ['productItems'],
          });
        } else if (!startDate && endDate) {
          productItems = await this._productItemRepository.find({
            where: {
              createdAt: LessThanOrEqual(endDate),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: {
                    status: transfertStatus,
                    validatedAt: LessThanOrEqual(endDate),
                  },
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: {
                    validatedAt: LessThanOrEqual(endDate),
                  },
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              status: OutputStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              status: InternalNeedStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              orderStatus: StepStatus.COMPLETE,
              cashedAt: LessThanOrEqual(endDate),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              status: OperationStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              state: CustomerReturnState.VALIDATED,
              validatedAt: LessThanOrEqual(endDate),
            },
            relations: ['productItems'],
          });
        } else if (specificDate) {
          productItems = await this._productItemRepository.find({
            where: {
              createdAt: Like(`${specificDate}%`),
            },
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            where: {
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: {
                    status: transfertStatus,
                    validatedAt: Like(`${specificDate}%`),
                  },
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  where: {
                    validatedAt: Like(`${specificDate}%`),
                  },
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              status: OutputStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              status: InternalNeedStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              orderStatus: StepStatus.COMPLETE,
              cashedAt: Like(`${specificDate}%`),
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              status: OperationStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              state: CustomerReturnState.VALIDATED,
              validatedAt: Like(`${specificDate}%`),
            },
            relations: ['productItems'],
          });
        } else {
          productItems = await this._productItemRepository.find({
            relations: ['productVariant'],
          });

          purchaseOrders = await this._purchaseOrderRepository.find({
            relations: ['variantPurchaseds'],
          });

          if (purchaseOrderType && !isNullOrWhiteSpace(purchaseOrderType)) {
            if (purchaseOrderType === PurchaseOrderType.FOR_ORDER) {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  !isNullOrWhiteSpace(purchaseOrder.orderRef) ||
                  purchaseOrder.order,
              );
            } else {
              purchaseOrders = purchaseOrders.filter(
                (purchaseOrder) =>
                  isNullOrWhiteSpace(purchaseOrder.orderRef) &&
                  !purchaseOrder.order,
              );
            }
          }

          transferts =
            transfertStatus && !isNullOrWhiteSpace(transfertStatus)
              ? await this._transfertRepository.find({
                  where: { status: transfertStatus },
                  relations: ['variantTransferts'],
                })
              : await this._transfertRepository.find({
                  relations: ['variantTransferts'],
                });

          otherOutputs = await this._otherOutputRepository.find({
            where: {
              status: OutputStatus.VALIDATED,
            },
            relations: ['variantsToOutput'],
          });

          internalNeeds = await this._internalNeedRepository.find({
            where: {
              status: InternalNeedStatus.VALIDATED,
            },
            relations: ['variantNeededs'],
          });

          transfertsOut = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
            },
            relations: ['variantTransferts'],
          });

          orders = await this._orderRepository.find({
            where: {
              orderStatus: StepStatus.COMPLETE,
            },
            relations: ['articleOrdereds'],
          });

          receptions = await this._receptionRepository.find({
            where: {
              status: OperationStatus.VALIDATED,
            },
            relations: ['productItems'],
          });

          transfertsIn = await this._transfertRepository.find({
            where: {
              status: TransfertStatus.VALIDATED,
            },
            relations: ['variantTransferts'],
          });

          customerReturns = await this._customerReturnRepository.find({
            where: {
              state: CustomerReturnState.VALIDATED,
            },
            relations: ['productItems'],
          });
        }
      }

      if (productItems.length > 0) {
        productItems.map((productItem) =>
          productVariants.push(productItem.productVariant),
        );
      }

      /**
       * Calcul stockValue
       */
      const stockValue: StockValueModel = {
        available: 0,
        discovered: 0,
        reserved: 0,
        inTransit: 0,
        deliveryProcessing: 0,
        awaitingSAV: 0,
        delivered: 0,
        gotOut: 0,
        pendingInvestigation: 0,
        lost: 0,
        isDead: 0,
        pendingReception: 0,
      };
      const availableItems = productItems.filter(
        (item) => item.state === ItemState.AVAILABLE,
      );
      const discoveredItems = productItems.filter(
        (item) => item.state === ItemState.DISCOVERED,
      );
      const reservedItems = productItems.filter(
        (item) => item.state === ItemState.RESERVED,
      );
      const inTransitItems = productItems.filter(
        (item) => item.state === ItemState.IN_TRANSIT,
      );
      const deliveryProcessingItems = productItems.filter(
        (item) => item.state === ItemState.DELIVERY_PROCESSING,
      );
      const awaitingSAVItems = productItems.filter(
        (item) => item.state === ItemState.AWAITING_SAV,
      );
      const deliveredItems = productItems.filter(
        (item) => item.state === ItemState.DELIVERED,
      );
      const gotOutItems = productItems.filter(
        (item) => item.state === ItemState.GOT_OUT,
      );
      const pendingInvestigationItems = productItems.filter(
        (item) => item.state === ItemState.PENDING_INVESTIGATION,
      );
      const lostItems = productItems.filter(
        (item) => item.state === ItemState.LOST,
      );
      const isDeadItems = productItems.filter(
        (item) => item.state === ItemState.IS_DEAD,
      );
      const pendingReceptionItems = productItems.filter(
        (item) => item.state === ItemState.PENDING_RECEPTION,
      );
      stockValue.available = availableItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.discovered = discoveredItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.reserved = reservedItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.inTransit = inTransitItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.deliveryProcessing = deliveryProcessingItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.awaitingSAV = awaitingSAVItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.delivered = deliveredItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.gotOut = gotOutItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.pendingInvestigation = pendingInvestigationItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.lost = lostItems.reduce((s, line) => s + line.purchaseCost, 0);
      stockValue.isDead = isDeadItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      stockValue.pendingReception = pendingReceptionItems.reduce(
        (s, line) => s + line.purchaseCost,
        0,
      );
      // productVariants.map((variant) => {
      //   stockValue.available =
      //     stockValue.available +
      //     variant.purchaseCost * variant.quantity.available;
      //   stockValue.reserved =
      //     stockValue.reserved +
      //     variant.purchaseCost * variant.quantity.reserved;
      //   stockValue.inTransit =
      //     stockValue.inTransit +
      //     variant.purchaseCost * variant.quantity.inTransit;
      //   stockValue.deliveryProcessing =
      //     stockValue.deliveryProcessing +
      //     variant.purchaseCost * variant.quantity.deliveryProcessing;
      //   stockValue.awaitingSAV =
      //     stockValue.awaitingSAV +
      //     variant.purchaseCost * variant.quantity.awaitingSAV;
      //   stockValue.pendingInvestigation =
      //     stockValue.pendingInvestigation +
      //     variant.purchaseCost * variant.quantity.pendingInvestigation;
      //   stockValue.lost =
      //     stockValue.lost + variant.purchaseCost * variant.quantity.lost;
      //   stockValue.isDead =
      //     stockValue.isDead + variant.purchaseCost * variant.quantity.isDead;
      // });

      // Calcul total purchase orders amount
      const allPurchaseCost: number[] = [];

      if (purchaseOrders.length > 0) {
        purchaseOrders.map((purchaseOrder) => {
          purchaseOrder.variantPurchaseds?.map((variantPurchased) =>
            allPurchaseCost.push(
              variantPurchased.quantity * variantPurchased.purchaseCost,
            ),
          );
        });
      }

      const totalPurchaseOrderAmount = allPurchaseCost.reduce(
        (sum, current) => sum + current,
        0,
      );

      // Calcul transfert amount
      let totalTransfertAmount = 0;

      await Promise.all(
        transferts.map(async (transfert) => {
          await Promise.all(
            transfert.variantTransferts.map(async (variantTransfert) => {
              const variant = await this._productVariantRepository.findOne({
                where: { id: variantTransfert.variantId },
              });

              totalTransfertAmount +=
                variant.purchaseCost * variantTransfert.quantity;
            }),
          );
        }),
      );

      // Build outputs
      const fleets: number[] = [];
      const pus: number[] = [];
      const savs: number[] = [];
      const supplierOutputs: number[] = [];
      const b2bs: number[] = [];
      const others: number[] = [];

      if (otherOutputs.length > 0) {
        await Promise.all(
          otherOutputs.map(async (otherOutput) => {
            await Promise.all(
              otherOutput.variantsToOutput.map(async (variantOutput) => {
                const variant = await this._productVariantRepository.findOne(
                  variantOutput.productVariantId,
                );

                if (otherOutput.outputType === OutputType.FLEET_OUTPUT) {
                  fleets.push(variant.salePrice * variantOutput.quantity);
                }

                if (otherOutput.outputType === OutputType.PUS_OUTPUT) {
                  pus.push(variant.salePrice * variantOutput.quantity);
                }

                if (otherOutput.outputType === OutputType.SAV_OUTPUT) {
                  savs.push(variant.salePrice * variantOutput.quantity);
                }

                if (otherOutput.outputType === OutputType.SUPPLIER_OUTPUT) {
                  supplierOutputs.push(
                    variant.salePrice * variantOutput.quantity,
                  );
                }

                if (otherOutput.outputType === OutputType.B2B_OUTPUT) {
                  b2bs.push(variant.salePrice * variantOutput.quantity);
                }

                if (otherOutput.outputType === OutputType.OTHER_OUTPUT) {
                  others.push(variant.salePrice * variantOutput.quantity);
                }
              }),
            );
          }),
        );
      }

      const totalFleet = fleets.reduce((total, current) => total + current, 0);
      const totalPus = pus.reduce((total, current) => total + current, 0);
      const totalSAV = savs.reduce((total, current) => total + current, 0);
      const totalSupplierOutput = supplierOutputs.reduce(
        (total, current) => total + current,
        0,
      );
      const totalB2B = b2bs.reduce((total, current) => total + current, 0);
      const totalOther = others.reduce((total, current) => total + current, 0);

      const otherOutputCost: OtherOutputModel = {
        fleet: totalFleet,
        pus: totalPus,
        sav: totalSAV,
        supplierOutput: totalSupplierOutput,
        b2b: totalB2B,
        other: totalOther,
      };

      let totalInternalNeed = 0;
      let totalTransfertOuts = 0;
      let totalOrder = 0;

      if (internalNeeds.length > 0) {
        internalNeeds.map((internalNeed) => {
          internalNeed.variantNeededs.map((variantNeeded) => {
            totalInternalNeed += variantNeeded.value * variantNeeded.quantity;
          });
        });
      }

      if (transfertsOut.length > 0) {
        await Promise.all(
          transfertsOut.map(async (transfert) => {
            await Promise.all(
              transfert.variantTransferts.map(async (variantTransfert) => {
                const variant = await this._productVariantRepository.findOne({
                  where: { id: variantTransfert.variantId },
                });

                totalTransfertOuts +=
                  variant.purchaseCost * variantTransfert.quantity;
              }),
            );
          }),
        );
      }

      if (orders.length > 0) {
        await Promise.all(
          orders.map(async (order) => {
            await Promise.all(
              order.articleOrdereds.map(async (articleOrdered) => {
                const article = await this._productVariantRepository.findOne({
                  id: articleOrdered.productVariantId,
                });

                totalOrder += article.salePrice * articleOrdered.quantity;
              }),
            );
          }),
        );
      }

      const outputs: OutputAmountOutput = {
        otherOutput: otherOutputCost,
        internalNeed: totalInternalNeed,
        transfert: totalTransfertOuts,
        order: totalOrder,
      };

      let totalReceptions = 0;
      let totalTransfertIn = 0;
      let totalCustomerReturn = 0;

      if (receptions.length > 0) {
        receptions.map(async (reception) => {
          reception.productItems.map(
            (productItem) => (totalReceptions += productItem.purchaseCost),
          );
        });
      }

      if (transfertsIn.length > 0) {
        await Promise.all(
          transfertsIn.map(async (transfert) => {
            await Promise.all(
              transfert.variantTransferts.map(async (variantTransfert) => {
                const variant = await this._productVariantRepository.findOne({
                  id: variantTransfert.variantId,
                });
                totalTransfertIn +=
                  variant.purchaseCost * variantTransfert.quantity;
              }),
            );
          }),
        );
      }

      if (customerReturns.length > 0) {
        customerReturns.map((customerReturn) => {
          customerReturn.productItems.map(
            (productItem) => (totalCustomerReturn += productItem.purchaseCost),
          );
        });
      }

      const inputs: InputAmountOutput = {
        reception: totalReceptions,
        transfert: totalTransfertIn,
        customerReturn: totalCustomerReturn,
      };

      // build total purchase
      purchaseOrders.forEach((purchaseOrder) => {
        if (purchaseOrder.order || purchaseOrder.orderRef) {
          orderPurchaseOrders.push(purchaseOrder);
        } else {
          stockPurchaseOrders.push(purchaseOrder);
        }
      });

      const totalPurchase: TotalPurchase = {
        stock: {
          pending: stockPurchaseOrders.filter(
            (purchaseOrder) => purchaseOrder.status === OperationStatus.PENDING,
          ).length,
          validated: stockPurchaseOrders.filter(
            (purchaseOrder) =>
              purchaseOrder.status === OperationStatus.VALIDATED,
          ).length,
          canceled: stockPurchaseOrders.filter(
            (purchaseOrder) =>
              purchaseOrder.status === OperationStatus.CANCELED,
          ).length,
        },
        order: {
          pending: orderPurchaseOrders.filter(
            (purchaseOrder) => purchaseOrder.status === OperationStatus.PENDING,
          ).length,
          validated: orderPurchaseOrders.filter(
            (purchaseOrder) =>
              purchaseOrder.status === OperationStatus.VALIDATED,
          ).length,
          canceled: orderPurchaseOrders.filter(
            (purchaseOrder) =>
              purchaseOrder.status === OperationStatus.CANCELED,
          ).length,
        },
      };

      // build total transfert
      const totalTransfert: TotalTransfert = {
        pending: transferts.filter(
          (transfert) => transfert.status === TransfertStatus.PENDING,
        ).length,
        validated: transferts.filter(
          (transfert) => transfert.status === TransfertStatus.VALIDATED,
        ).length,
        canceled: transferts.filter(
          (transfert) => transfert.status === TransfertStatus.CANCELED,
        ).length,
        confirmed: transferts.filter(
          (transfert) => transfert.status === TransfertStatus.CONFIRMED,
        ).length,
      };

      // build total output
      const totalOutput =
        otherOutputs.filter(
          (otherOutput) => otherOutput.status === OutputStatus.VALIDATED,
        ).length +
        internalNeeds.filter(
          (internalNeed) =>
            internalNeed.status === InternalNeedStatus.VALIDATED,
        ).length +
        transfertsOut.filter(
          (transfert) => transfert.status === TransfertStatus.VALIDATED,
        ).length +
        orders.filter((order) => order.orderStatus === StepStatus.DELIVERED)
          .length;

      return new GetWarehouseResumeOutput(
        productItems.length,
        stockValue,
        totalPurchaseOrderAmount,
        totalPurchase,
        totalTransfertAmount,
        totalTransfert,
        outputs,
        totalOutput,
        inputs,
        lang,
        storagePoint,
        startDate,
        endDate,
        specificDate,
        purchaseOrderType,
        transfertStatus,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetWarehouseResumeService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetWarehouseResumeInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      let storagePoint: StoragePoint;

      if (input.storagePointId && !isNullOrWhiteSpace(input.storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne(
          input.storagePointId,
        );

        if (!storagePoint) {
          throw new NotFoundException(
            `StoragePoint ${input.storagePointId} not found`,
          );
        }
      }

      if (input.specificDate && (input.startDate || input.endDate)) {
        throw new BadRequestException(
          `You cannot choose a specific date and a start date or end date`,
        );
      }

      return {
        storagePoint,
        isStoragePoint: !!storagePoint,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetWarehouseResumeService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
