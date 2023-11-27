import {
  AgentRoles,
  ISOLang,
  UserCon,
  isNullOrWhiteSpace,
} from '@glosuite/shared';
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
import { Order } from 'src/domain/entities/orders';
import { CommentModel } from 'src/domain/interfaces';
import { OrderRepository } from 'src/repositories/orders';
import { CashOrderInput, CashOrderOutput } from './dto';
import {
  CashLevel,
  OrderStep,
  OrderVersion,
  ToBeCashed,
} from 'src/domain/enums/orders';
import {
  AdvanceHistoryStatus,
  AlertType,
  InstalmentStatus,
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import { StepStatus } from 'src/domain/enums/flows';
import { CounterService, OrderService } from 'src/services/generals';
import {
  AdvanceModel,
  AmountByMethod,
  CashedAlert,
  Instalment,
} from 'src/domain/interfaces/finance';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import { OrderReferenceService } from 'src/services/references/orders';
import { OrderProcessingRepository } from 'src/repositories/flows';
import { OrderProcessing } from 'src/domain/entities/flows';
import { Counter } from 'src/domain/entities/finance';
import { CounterRepository } from 'src/repositories/finance';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';

type ValidationResult = {
  orders: Order[];
  comments: CommentModel[];
  instalments: Instalment;
  advance: AdvanceModel;
  cashLevel: CashLevel;
  alert: CashedAlert;
  paymentMethod: PaymentMethod;
  paymentRef: string;
  storagePoint: StoragePoint;
  isComment: boolean;
  isInstalment: boolean;
  isAdvance: boolean;
  isAlert: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CashOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    @InjectRepository(Counter)
    private readonly _counterRepository: CounterRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _orderService: OrderService,
    private readonly _orderReferenceService: OrderReferenceService,
    private readonly _counterService: CounterService,
  ) {}

  async cashOrder(
    input: CashOrderInput,
    user: UserCon,
  ): Promise<CashOrderOutput> {
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
  ): Promise<CashOrderOutput> {
    try {
      const {
        orders,
        comments,
        instalments,
        advance,
        cashLevel,
        alert,
        paymentMethod,
        paymentRef,
        storagePoint,
        isComment,
        isInstalment,
        isAdvance,
        isAlert,
        lang,
        user,
      } = result;

      const orderProcessingsToSave: OrderProcessing[] = [];
      const ordersToEdit: Order[] = [];
      let amountExpected = 0;
      const amountByMethod: AmountByMethod[] = [];

      for (const order of orders) {
        const actualState = order.orderStep;
        const actualStatus = order.orderStatus;
        order.paymentMethod = paymentMethod;
        if (paymentRef) order.paymentRef = paymentRef;

        const lastOrderProcessing =
          await this._orderProcessingRepository.findOne({
            where: {
              state: actualState,
              status: actualStatus,
              orderId: order.id,
            },
          });

        if (lastOrderProcessing) {
          lastOrderProcessing.endDate = new Date();
          orderProcessingsToSave.push(lastOrderProcessing);
        }

        switch (order.paymentMode) {
          case PaymentMode.INSTALMENT_PAYMENT:
            if (
              cashLevel === CashLevel.FLEET ||
              cashLevel === CashLevel.PUS ||
              cashLevel === CashLevel.EXPEDITION
            ) {
              if (isInstalment) {
                order.instalment = instalments;
                order.toBeCashed = ToBeCashed.YES;
                if (instalments.balance === 0) {
                  order.paymentStatus = PaymentStatus.PAID;
                }
              }
              if (isComment) order.comments = comments;
            }

            if (cashLevel === CashLevel.FINANCE) {
              order.instalment.instalments.map((instalment) => {
                if (instalment.status === InstalmentStatus.PAID) {
                  instalment.cashedAt = new Date();
                  instalment.cashedBy = user;
                  instalment.status = InstalmentStatus.CASHED;
                  amountExpected += instalment.value;
                  amountByMethod.push({
                    paymentMethod: instalment.paymentMethod,
                    paymentRef: instalment.paymentRef
                      ? instalment.paymentRef
                      : null,
                    amount: instalment.value,
                  });
                }
                return instalment;
              });

              if (
                order.instalment.balance === 0 ||
                !order.instalment.instalments.some(
                  (instalment) => instalment.status === InstalmentStatus.UNPAID,
                )
              ) {
                if (order.orderStatus === StepStatus.DELIVERED) {
                  order.paymentStatus = PaymentStatus.CASHED_AND_COMPLETE;
                  order.orderStatus = StepStatus.COMPLETE;
                  order.orderStep = OrderStep.CASH_IN_HAND;
                } else {
                  order.paymentStatus = PaymentStatus.CASHED_AND_INCOMPLETE;
                }
                order.toBeCashed = ToBeCashed.NOT_YET;
                order.cashedAt = new Date();
                order.cashedBy = user;
              } else {
                order.toBeCashed = ToBeCashed.NO;
              }
            }

            break;

          case PaymentMode.ADVANCE_PAYMENT:
            if (
              cashLevel === CashLevel.FLEET ||
              cashLevel === CashLevel.PUS ||
              cashLevel === CashLevel.EXPEDITION
            ) {
              if (isAdvance) {
                order.advance = advance;
                order.toBeCashed = ToBeCashed.YES;
                if (advance.balance === 0) {
                  order.paymentStatus = PaymentStatus.PAID;
                }
              }
              if (isComment) order.comments = comments;
            }

            if (cashLevel === CashLevel.FINANCE) {
              order.advance.history.map((item) => {
                if (item.status === AdvanceHistoryStatus.PAID) {
                  item.cashedAt = new Date();
                  item.cashedBy = user;
                  item.status = AdvanceHistoryStatus.CASHED;
                  amountExpected += item.amount;
                  amountByMethod.push({
                    paymentMethod: item.paymentMethod,
                    paymentRef: item.paymentRef ? item.paymentRef : null,
                    amount: item.amount,
                  });
                }
                return item;
              });

              if (
                order.advance.balance === 0 ||
                !order.advance.history.find(
                  (item) => item.status !== AdvanceHistoryStatus.CASHED,
                )
              ) {
                if (order.orderStatus === StepStatus.DELIVERED) {
                  order.paymentStatus = PaymentStatus.CASHED_AND_COMPLETE;
                  order.orderStatus = StepStatus.COMPLETE;
                  order.orderStep = OrderStep.CASH_IN_HAND;
                } else {
                  order.paymentStatus = PaymentStatus.CASHED_AND_INCOMPLETE;
                }
                order.toBeCashed = ToBeCashed.NOT_YET;
                order.cashedAt = new Date();
                order.cashedBy = user;
              } else {
                order.toBeCashed = ToBeCashed.NO;
              }
            }

            break;

          case PaymentMode.BEFORE_DELIVERY:
            if (cashLevel === CashLevel.FINANCE) {
              if (order.orderStatus === StepStatus.DELIVERED) {
                order.paymentStatus = PaymentStatus.CASHED_AND_COMPLETE;
                order.orderStatus = StepStatus.COMPLETE;
                order.orderStep = OrderStep.CASH_IN_HAND;
              } else {
                order.paymentStatus = PaymentStatus.CASHED_AND_INCOMPLETE;
              }
              order.toBeCashed = ToBeCashed.NOT_YET;
              order.cashedAt = new Date();
              order.cashedBy = user;
              amountExpected += order.total;
              amountByMethod.push({
                paymentMethod: order.paymentMethod,
                paymentRef: order.paymentRef ? order.paymentRef : null,
                amount: order.total,
              });
            }

            break;

          case PaymentMode.AFTER_DELIVERY:
            order.paymentStatus = PaymentStatus.CASHED_AND_COMPLETE;
            order.orderStatus = StepStatus.COMPLETE;
            order.orderStep = OrderStep.CASH_IN_HAND;
            order.toBeCashed = ToBeCashed.NOT_YET;
            order.cashedAt = new Date();
            order.cashedBy = user;
            amountExpected += order.total;
            amountByMethod.push({
              paymentMethod: order.paymentMethod,
              paymentRef: order.paymentRef ? order.paymentRef : null,
              amount: order.total,
            });

            break;
        }

        const orderProcessing = new OrderProcessing();

        orderProcessing.reference =
          await this._orderReferenceService.generateOrderProcessingReference(
            order,
          );
        orderProcessing.state = order.orderStep;
        orderProcessing.status = order.orderStatus;
        orderProcessing.startDate = new Date();
        orderProcessing.order = order;
        orderProcessing.orderId = order.id;

        orderProcessingsToSave.push(orderProcessing);

        ordersToEdit.push(order);
      }

      if (cashLevel === CashLevel.FINANCE) {
        const counter = new Counter();

        counter.reference = await this._counterService.generateReference();
        counter.name = this._counterService.generateName(user);
        counter.amountExpected = amountExpected;
        counter.amountCollected = amountExpected;
        if (isAlert) {
          counter.alert = alert;
          counter.amountCollected =
            alert.type === AlertType.MISSING
              ? counter.amountCollected - alert.amount
              : counter.amountCollected + alert.amount;
        }
        counter.amountsByMethod = amountByMethod;
        counter.cashierId = user.id;
        counter.createdBy = user;
        counter.storagePointId = storagePoint ? storagePoint.id : null;
        counter.storagePoint = storagePoint ? storagePoint : null;
        counter.orders = ordersToEdit;

        await this._counterRepository.save(counter);

        ordersToEdit.map((order) => {
          order.counter = counter;
          order.counterId = counter.id;
          return order;
        });
      }

      await this._orderRepository.save(ordersToEdit);
      await this._orderProcessingRepository.save(orderProcessingsToSave);

      return new CashOrderOutput(
        ordersToEdit.map((order) => new MiniOrderOutput(order)),
        ordersToEdit.length,
      );
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${CashOrderService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: CashOrderInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.TREASURY ||
            role === AgentRoles.PUS_CASHIER ||
            role === AgentRoles.FLEET_SUPERVISOR ||
            role === AgentRoles.EXPEDITION_SUPERVISOR ||
            role === AgentRoles.EXPEDITION_AGENT ||
            role === AgentRoles.LOGISTIC_MANAGER,
        )
      ) {
        throw new UnauthorizedException(`You are not allowed to cash an order`);
      }

      if (input.cashLevel !== CashLevel.FINANCE) {
        if (
          !input.amount &&
          (Number.isNaN(input.amount) || input.amount <= 0)
        ) {
          throw new HttpException(
            `Invalid fields: amount ${input.amount}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (input.barcodes.length > 1) {
          throw new BadRequestException(
            `Invalid input: You cannot cash more than one order`,
          );
        }

        if (!input.paymentMethod) {
          throw new BadRequestException(`Please provide the payment method`);
        }

        if (
          (input.paymentMethod === PaymentMethod.MOBILE_MONEY ||
            input.paymentMethod === PaymentMethod.ORANGE_MONEY ||
            input.paymentMethod === PaymentMethod.GLOTELHO_PAY) &&
          !input.paymentRef
        ) {
          throw new BadRequestException(
            `Please provide the payment reference for the ${input.paymentMethod} payment`,
          );
        }
      }

      const orders: Order[] = [];

      await Promise.all(
        input.barcodes.map(async (barcode) => {
          const order = await this._orderRepository.findOne({
            where: { barcode },
            relations: [
              'billingAddress',
              'deliveryAddress',
              'voucher',
              'storagePoint',
              'child',
              'parent',
              'customerReturns',
              'productItems',
              'transferts',
              'articleOrdereds',
              'orderProcessings',
              'purchaseOrder',
            ],
          });

          if (!order) {
            throw new NotFoundException(
              `Order of barcode ${barcode} is not found`,
            );
          }

          // if (
          //   order.paymentMode === PaymentMode.BEFORE_DELIVERY ||
          //   order.paymentMode === PaymentMode.ADVANCE_PAYMENT ||
          //   order.paymentMode === PaymentMode.INSTALMENT_PAYMENT
          // ) {
          //   if (
          //     order.orderStatus === StepStatus.DELIVERED ||
          //     order.orderStatus === StepStatus.CANCELED ||
          //     order.orderStatus === StepStatus.COMPLETE ||
          //     order.orderStatus === StepStatus.REFUNDED ||
          //     (input.cashLevel !== CashLevel.FINANCE &&
          //       order.paymentStatus !== PaymentStatus.UNPAID) ||
          //     (input.cashLevel === CashLevel.FINANCE &&
          //       order.paymentStatus !== PaymentStatus.PAID)
          //   ) {
          //     throw new BadRequestException(
          //       `You cannot cash a ${order.orderStatus} or ${order.paymentStatus} order`,
          //     );
          //   }
          // } else if (order.paymentMode === PaymentMode.AFTER_DELIVERY) {
          //   if (
          //     input.cashLevel !== CashLevel.FINANCE ||
          //     !user.roles.some(
          //       (role) =>
          //         role === AgentRoles.TREASURY ||
          //         role === AgentRoles.ACCOUNTING,
          //     )
          //   ) {
          //     throw new UnauthorizedException(
          //       `You are not authorized to cash the order ${order.reference}`,
          //     );
          //   }

          //   if (
          //     order.orderStatus !== StepStatus.DELIVERED ||
          //     order.paymentStatus !== PaymentStatus.UNPAID
          //   ) {
          //     throw new BadRequestException(
          //       `You cannot cash a ${order.orderStatus} or ${order.paymentStatus} order`,
          //     );
          //   }
          // }

          // if (
          //   (order.paymentMode === PaymentMode.INSTALMENT_PAYMENT ||
          //     order.paymentMode === PaymentMode.ADVANCE_PAYMENT) &&
          //   !input.amount
          // ) {
          //   const tip =
          //     order.paymentMode === PaymentMode.INSTALMENT_PAYMENT
          //       ? ' instalment '
          //       : ' advance ';
          //   throw new BadRequestException(`Please provide the ${tip} amount`);
          // }

          if (order.version !== OrderVersion.CURRENT) {
            throw new BadRequestException(
              `Cannot cash ${order.version} order. '${order.reference} - ${order.barcode}`,
            );
          }

          if (input.cashLevel === CashLevel.FINANCE) {
            if (order.toBeCashed !== ToBeCashed.YES) {
              throw new BadRequestException(
                `You cannot cash this order: '${order.reference}'`,
              );
            }

            if (
              !user.roles.some(
                (role) =>
                  role === AgentRoles.TREASURY ||
                  role === AgentRoles.ACCOUNTING,
              )
            ) {
              throw new UnauthorizedException(
                `You are not authorized to cash orders`,
              );
            }

            if (
              order.orderStatus === StepStatus.CANCELED ||
              order.orderStatus === StepStatus.COMPLETE ||
              order.orderStatus === StepStatus.REFUNDED
            ) {
              throw new BadRequestException(
                `You cannot cash a ${order.orderStatus} order: '${order.reference}'`,
              );
            }

            if (
              ((order.paymentMode === PaymentMode.AFTER_DELIVERY ||
                order.paymentMode === PaymentMode.BEFORE_DELIVERY) &&
                order.paymentStatus !== PaymentStatus.PAID) ||
              (order.paymentMode === PaymentMode.INSTALMENT_PAYMENT &&
                !order.instalment.instalments.find(
                  (instalment) => instalment.status === InstalmentStatus.PAID,
                )) ||
              (order.paymentMode === PaymentMode.ADVANCE_PAYMENT &&
                !order.advance.history.find(
                  (line) => line.status === AdvanceHistoryStatus.PAID,
                ))
            ) {
              throw new BadRequestException(
                `You cannot cash this order: '${
                  order.reference
                }', ${this._buildErrorMessage(order)}`,
              );
            }
          } else {
            if (
              order.paymentMode !== PaymentMode.INSTALMENT_PAYMENT &&
              order.paymentMode !== PaymentMode.ADVANCE_PAYMENT
            ) {
              throw new UnauthorizedException(
                `You can only cash instalment or advance payments`,
              );
            }

            if (!input.amount) {
              const tip =
                order.paymentMode === PaymentMode.INSTALMENT_PAYMENT
                  ? ' instalment '
                  : ' advance ';
              throw new BadRequestException(`Please provide the ${tip} amount`);
            }

            if (
              order.paymentMode === PaymentMode.INSTALMENT_PAYMENT &&
              !order.instalment.instalments.find(
                (instalment) => instalment.status === InstalmentStatus.UNPAID,
              )
            ) {
              throw new BadRequestException(
                `The order '${order.reference}' does not have an ${InstalmentStatus.UNPAID} instalement`,
              );
            }

            if (
              order.paymentMode === PaymentMode.ADVANCE_PAYMENT &&
              order.advance.balance === 0
            ) {
              throw new BadRequestException(
                `You cannot cash an advance payment on this order '${order.reference}'. The balance is ${order.advance.balance}`,
              );
            }
          }

          orders.push(order);
        }),
      );

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.ACCOUNTING || role === AgentRoles.TREASURY,
        ) &&
        orders.some((order) => !order.instalment && !order.advance)
      ) {
        throw new UnauthorizedException(
          `You are only authorized to cash installments or advance payments`,
        );
      }

      let comments: CommentModel[] = [];
      if (
        orders.length === 1 &&
        input.comment &&
        !isNullOrWhiteSpace(input.comment)
      ) {
        comments = this._orderService.buildOrderComments(
          orders[0],
          input.comment,
          user,
        );
      }

      let instalments: Instalment;
      let advance: AdvanceModel;

      if (
        input.cashLevel === CashLevel.PUS ||
        input.cashLevel === CashLevel.FLEET ||
        input.cashLevel === CashLevel.EXPEDITION
      ) {
        if (orders[0].paymentMode === PaymentMode.INSTALMENT_PAYMENT) {
          instalments = this._orderService.buildOrderInstalments(
            orders[0],
            input.amount,
            user,
            input.paymentMethod,
            input.paymentRef,
          );
        }

        if (orders[0].paymentMode === PaymentMode.ADVANCE_PAYMENT) {
          if (orders[0].advance?.history?.length === 0) {
            if (input.amount < orders[0].advance.firstPayment) {
              throw new BadRequestException(
                `The first payment must be greater or equal to ${orders[0].advance.firstPayment}`,
              );
            }
          }

          advance = this._orderService.buildOrderAdvances(
            orders[0],
            input.amount,
            user,
            input.paymentMethod,
            input.paymentRef,
          );
        }
      }

      let storagePoint: StoragePoint;
      if (input.cashLevel === CashLevel.FINANCE) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: user.workStation.warehouse?.reference },
        });
      }

      return {
        orders,
        comments,
        instalments,
        advance,
        cashLevel: input.cashLevel,
        alert: input.alert,
        paymentMethod: input.paymentMethod,
        paymentRef: input.paymentRef,
        storagePoint,
        isComment: comments.length > 0,
        isInstalment: !!instalments,
        isAdvance: !!advance,
        isAlert: !!input.alert,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CashOrderService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private _buildErrorMessage(order: Order): string {
    if (
      order.paymentMode === PaymentMode.AFTER_DELIVERY ||
      order.paymentMode === PaymentMode.BEFORE_DELIVERY
    ) {
      return ` payment status is ${order.paymentStatus}.`;
    }

    if (order.paymentMode === PaymentMode.INSTALMENT_PAYMENT) {
      return ` the order does not have a PAID instalment.`;
    }

    if (order.paymentMode === PaymentMode.ADVANCE_PAYMENT) {
      return ` the order does not have a PAID advance.`;
    }
  }
}
