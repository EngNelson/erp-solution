import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetSalesReportInput, GetSalesReportOutput } from './dto';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { AgentRoles, UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import { DeliveryHub, DeliveryMode } from 'src/domain/enums/orders';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/domain/entities/orders';
import { OrderRepository } from 'src/repositories/orders';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { MiniUserPayload } from 'src/domain/interfaces';
import { USERS_RESOURCE } from 'src/domain/constants';
import { HttpService } from '@nestjs/axios';
import {
  Between,
  FindOperator,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
} from 'typeorm';
import { StepStatus } from 'src/domain/enums/flows';
import {
  AdvanceHistoryStatus,
  InstalmentStatus,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';
import {
  SalesReportItem,
  SalesReportModel,
  SalesReportParameters,
} from 'src/domain/interfaces/analytics/ventes';
import { GetSalesReportOutputResult } from 'src/domain/dto/analytics/ventes';

type ValidationResult = {
  storagePoint?: StoragePoint;
  agent?: MiniUserPayload;
  deliveryMode?: DeliveryMode;
  startDate?: Date;
  endDate?: Date;
  specificDate?: Date;
};

type WhereClause = {
  orderStatus?: FindOperator<StepStatus>;
  paymentStatus?: FindOperator<PaymentStatus>;
  paymentMode?: FindOperator<PaymentMode>;
  storagePointId?: string;
  deliverValidatedBy?: UserCon;
  canceledBy?: UserCon;
  reportedBy?: UserCon;
  deliveryMode?: DeliveryMode;
  deliveredAt?: FindOperator<Date> | FindOperator<string>;
  reportedAt?: FindOperator<Date> | FindOperator<string>;
  canceledAt?: FindOperator<Date> | FindOperator<string>;
};

@Injectable()
export class GetSalesReportService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _httpService: HttpService,
  ) {}

  async getSalesReport(
    input: GetSalesReportInput,
    user: UserCon,
    accessToken: string,
  ): Promise<GetSalesReportOutput> {
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
  ): Promise<GetSalesReportOutput> {
    try {
      const {
        storagePoint,
        agent,
        deliveryMode,
        startDate,
        endDate,
        specificDate,
      } = result;

      const whereClause: WhereClause = {};
      const salesReportParams: SalesReportParameters = {};

      if (storagePoint) {
        whereClause.storagePointId = storagePoint.id;
        salesReportParams.storagePoint = storagePoint;
      }
      if (deliveryMode) {
        whereClause.deliveryMode = deliveryMode;
        salesReportParams.hub =
          deliveryMode === DeliveryMode.IN_AGENCY
            ? DeliveryHub.PUS
            : DeliveryHub.FLEET;
      }

      const cashedWhereClause: WhereClause = {
        paymentMode: In([
          PaymentMode.BEFORE_DELIVERY,
          PaymentMode.INSTALMENT_PAYMENT,
          PaymentMode.ADVANCE_PAYMENT,
          PaymentMode.AFTER_DELIVERY,
        ]),
      };
      const deliveredWhereClause: WhereClause = {
        orderStatus: In([StepStatus.DELIVERED, StepStatus.COMPLETE]),
        paymentStatus: In([
          PaymentStatus.PAID,
          PaymentStatus.CASHED_AND_COMPLETE,
          PaymentStatus.CASHED_AND_INCOMPLETE,
        ]),
      };
      const canceledWhereClause: WhereClause = {
        orderStatus: In([StepStatus.CANCELED]),
      };
      const reportedWhereClause: WhereClause = {
        orderStatus: In([StepStatus.REPORTED]),
      };

      if (startDate && endDate) {
        deliveredWhereClause.deliveredAt = Between(startDate, endDate);
        canceledWhereClause.canceledAt = Between(startDate, endDate);
        reportedWhereClause.reportedAt = Between(startDate, endDate);
        salesReportParams.startDate = startDate;
        salesReportParams.endDate = endDate;
      } else if (startDate && !endDate) {
        deliveredWhereClause.deliveredAt = MoreThanOrEqual(startDate);
        canceledWhereClause.canceledAt = MoreThanOrEqual(startDate);
        reportedWhereClause.reportedAt = MoreThanOrEqual(startDate);
        salesReportParams.startDate = startDate;
      } else if (!startDate && endDate) {
        deliveredWhereClause.deliveredAt = LessThanOrEqual(endDate);
        canceledWhereClause.canceledAt = LessThanOrEqual(endDate);
        reportedWhereClause.reportedAt = LessThanOrEqual(endDate);
        salesReportParams.endDate = endDate;
      } else if (specificDate) {
        deliveredWhereClause.deliveredAt = Like(`%${specificDate}%`);
        canceledWhereClause.canceledAt = Like(`%${specificDate}%`);
        reportedWhereClause.reportedAt = Like(`%${specificDate}%`);
        salesReportParams.specificDate = specificDate;
      }

      const orders = await this._orderRepository.find({
        where: { ...whereClause, ...cashedWhereClause },
      });

      let ordersDelivered = await this._orderRepository.find({
        where: { ...whereClause, ...deliveredWhereClause },
      });

      let ordersCancelled = await this._orderRepository.find({
        where: { ...whereClause, ...canceledWhereClause },
      });

      let ordersReported = await this._orderRepository.find({
        where: { ...whereClause, ...reportedWhereClause },
      });

      const cashedReport: SalesReportItem[] = [];

      const instalments = orders.filter(
        (order) => order.paymentMode === PaymentMode.INSTALMENT_PAYMENT,
      );
      const advances = orders.filter(
        (order) => order.paymentMode === PaymentMode.ADVANCE_PAYMENT,
      );
      const befores = orders.filter(
        (order) =>
          order.paymentMode === PaymentMode.BEFORE_DELIVERY &&
          order.paymentStatus !== PaymentStatus.UNPAID,
      );
      let afters = ordersDelivered.filter(
        (order) =>
          order.paymentMode === PaymentMode.AFTER_DELIVERY &&
          order.paymentStatus !== PaymentStatus.UNPAID &&
          order.orderStatus === StepStatus.DELIVERED,
      );

      let ordersInstalment: Order[] = [];
      let ordersAdvance: Order[] = [];
      let ordersBefore: Order[] = [];

      if (startDate && endDate) {
        ordersInstalment = instalments.filter((order) =>
          order.instalment.instalments.find(
            (instalment) =>
              instalment.paidAt.getTime() >= startDate.getTime() &&
              instalment.paidAt.getTime() <= endDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          ),
        );

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) =>
              instalment.paidAt.getTime() >= startDate.getTime() &&
              instalment.paidAt.getTime() <= endDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = advances.filter((order) =>
          order.advance?.history.find(
            (history) =>
              history.paidAt.getTime() >= startDate.getTime() &&
              history.paidAt.getTime() <= endDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) =>
              history.paidAt.getTime() >= startDate.getTime() &&
              history.paidAt.getTime() <= endDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersBefore = befores.filter(
          (order) =>
            order.beforeDeliveryPayment.savedAt.getTime() >=
              startDate.getTime() &&
            order.beforeDeliveryPayment.savedAt.getTime() <= endDate.getTime(),
        );
      } else if (startDate && !endDate) {
        ordersInstalment = instalments.filter((order) =>
          order.instalment.instalments.find(
            (instalment) =>
              instalment.paidAt.getTime() >= startDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          ),
        );

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) =>
              instalment.paidAt.getTime() >= startDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = advances.filter((order) =>
          order.advance?.history.find(
            (history) =>
              history.paidAt.getTime() >= startDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) =>
              history.paidAt.getTime() >= startDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersBefore = befores.filter(
          (order) =>
            order.beforeDeliveryPayment.savedAt.getTime() >=
            startDate.getTime(),
        );
      } else if (!startDate && endDate) {
        ordersInstalment = instalments.filter((order) =>
          order.instalment.instalments.find(
            (instalment) =>
              instalment.paidAt.getTime() <= endDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          ),
        );

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) =>
              instalment.paidAt.getTime() <= endDate.getTime() &&
              instalment.status !== InstalmentStatus.UNPAID,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = advances.filter((order) =>
          order.advance?.history.find(
            (history) =>
              history.paidAt.getTime() <= endDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) =>
              history.paidAt.getTime() <= endDate.getTime() &&
              history.status === AdvanceHistoryStatus.PAID,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersBefore = befores.filter(
          (order) =>
            order.beforeDeliveryPayment.savedAt.getTime() <= endDate.getTime(),
        );
      } else if (specificDate) {
        ordersInstalment = instalments.filter((order) =>
          order.instalment.instalments.find(
            (instalment) =>
              instalment.paidAt === specificDate &&
              instalment.status !== InstalmentStatus.UNPAID,
          ),
        );

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) =>
              instalment.paidAt === specificDate &&
              instalment.status !== InstalmentStatus.UNPAID,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = advances.filter((order) =>
          order.advance?.history.find(
            (history) =>
              history.paidAt === specificDate &&
              history.status === AdvanceHistoryStatus.PAID,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) =>
              history.paidAt === specificDate &&
              history.status === AdvanceHistoryStatus.PAID,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersBefore = befores.filter(
          (order) => order.beforeDeliveryPayment.savedAt === specificDate,
        );
      } else {
        ordersInstalment = instalments.filter((order) =>
          order.instalment.instalments.find(
            (instalment) => instalment.status !== InstalmentStatus.UNPAID,
          ),
        );

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) => instalment.status !== InstalmentStatus.UNPAID,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = advances.filter((order) =>
          order.advance?.history.find(
            (history) => history.status === AdvanceHistoryStatus.PAID,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) => history.status === AdvanceHistoryStatus.PAID,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });
      }

      if (agent) {
        salesReportParams.agent = agent;

        ordersInstalment = ordersInstalment.filter((order) =>
          order.instalment.instalments.find(
            (instalment) => instalment.paidBy.email === agent.email,
          ),
        );

        // cashedReport = [];

        ordersInstalment.forEach((order) => {
          const instalments = order.instalment.instalments.filter(
            (instalment) => instalment.paidBy.email === agent.email,
          );

          instalments.forEach((instalment) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === instalment.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += instalment.value;
            } else {
              reportItem = {
                paymentMethod: instalment.paymentMethod,
                total: 1,
                amount: instalment.value,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersAdvance = ordersAdvance.filter((order) =>
          order.advance?.history.find(
            (history) => history.paidBy.email === agent.email,
          ),
        );

        ordersAdvance.forEach((order) => {
          const advances = order.advance?.history.filter(
            (history) => history.paidBy.email === agent.email,
          );

          advances.forEach((advance) => {
            let reportItem = cashedReport.find(
              (cash) => cash.paymentMethod === advance.paymentMethod,
            );
            if (!!reportItem) {
              reportItem.total++;
              reportItem.amount += advance.amount;
            } else {
              reportItem = {
                paymentMethod: advance.paymentMethod,
                total: 1,
                amount: advance.amount,
              };
              cashedReport.push(reportItem);
            }
          });
        });

        ordersBefore = befores.filter(
          (order) => order.beforeDeliveryPayment.savedBy.email === agent.email,
        );

        afters = afters.filter(
          (order) => order.deliverValidatedBy.email === agent.email,
        );

        ordersDelivered = ordersDelivered.filter(
          (order) => order.deliverValidatedBy.email === agent.email,
        );

        ordersCancelled = ordersCancelled.filter(
          (order) => order.canceledBy.email === agent.email,
        );

        ordersReported = ordersReported.filter(
          (order) => order.reportedBy.email === agent.email,
        );
      }

      ordersBefore.forEach((before) => {
        let reportItem = cashedReport.find(
          (cash) => cash.paymentMethod === before.paymentMethod,
        );
        if (!!reportItem) {
          reportItem.total++;
          reportItem.amount += before.total;
        } else {
          reportItem = {
            paymentMethod: before.paymentMethod,
            total: 1,
            amount: before.total,
          };
          cashedReport.push(reportItem);
        }
      });

      afters.forEach((after) => {
        let reportItem = cashedReport.find(
          (cash) => cash.paymentMethod === after.paymentMethod,
        );
        if (!!reportItem) {
          reportItem.total++;
          reportItem.amount += after.total;
        } else {
          reportItem = {
            paymentMethod: after.paymentMethod,
            total: 1,
            amount: after.total,
          };
          cashedReport.push(reportItem);
        }
      });

      const deliveredReport: SalesReportItem[] = [];
      const canceledReport: SalesReportItem[] = [];
      const reportedReport: SalesReportItem[] = [];

      ordersDelivered.forEach((order) => {
        let reportItem = deliveredReport.find(
          (d) => d.paymentMethod === order.paymentMethod,
        );
        if (!!reportItem) {
          reportItem.total++;
          reportItem.amount += order.total;
        } else {
          reportItem = {
            paymentMethod: order.paymentMethod,
            total: 1,
            amount: order.total,
          };
          deliveredReport.push(reportItem);
        }
      });

      ordersCancelled.forEach((order) => {
        let reportItem = canceledReport.find(
          (c) => c.paymentMethod === order.paymentMethod,
        );
        if (!!reportItem) {
          reportItem.total++;
          reportItem.amount += order.total;
        } else {
          reportItem = {
            paymentMethod: order.paymentMethod,
            total: 1,
            amount: order.total,
          };
          canceledReport.push(reportItem);
        }
      });

      ordersReported.forEach((order) => {
        let reportItem = reportedReport.find(
          (c) => c.paymentMethod === order.paymentMethod,
        );
        if (!!reportItem) {
          reportItem.total++;
          reportItem.amount += order.total;
        } else {
          reportItem = {
            paymentMethod: order.paymentMethod,
            total: 1,
            amount: order.total,
          };
          reportedReport.push(reportItem);
        }
      });

      const reports: SalesReportModel = {
        cashed: cashedReport,
        delivered: deliveredReport,
        cancelled: canceledReport,
        reported: reportedReport,
      };

      const salesReportResult = new GetSalesReportOutputResult(reports);

      const output = new GetSalesReportOutput(
        salesReportParams,
        salesReportResult,
      );

      return output;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetSalesReportService.name} - ${this._tryExecution.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetSalesReportInput,
    user: UserCon,
    accessToken: string,
  ): Promise<ValidationResult> {
    try {
      const { storagePointId, agentId, startDate, endDate, specificDate } =
        input;

      let deliveryMode = input.deliveryMode;

      let storagePoint: StoragePoint;
      if (storagePointId && !isNullOrWhiteSpace(storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: storagePointId },
        });

        if (!storagePoint) {
          throw new NotFoundException(
            `StoragePoint ${input.storagePointId} not found`,
          );
        }
      }

      const userCanOnlySeeOwner =
        user.roles.some(
          (role) =>
            role === AgentRoles.PUS_AGENT ||
            role === AgentRoles.PUS_MANAGER ||
            role === AgentRoles.PUS_CASHIER ||
            role === AgentRoles.FLEET_SUPERVISOR,
        ) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.PUS_COORDINATOR ||
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.TREASURY,
        );

      let agent: MiniUserPayload;
      if (agentId && !isNullOrWhiteSpace(agentId) && !userCanOnlySeeOwner) {
        const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
        console.log('AUTH ENDPOINT ', path);

        await this._httpService.axiosRef
          .get(path + `/${agentId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          })
          .then(async (response) => {
            console.log(
              `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
              'Data ',
              response.data,
            );

            agent = {
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

      if (userCanOnlySeeOwner) {
        agent = {
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
        };
        storagePoint = await this._storagePointRepository.findOne({
          where: { reference: user.workStation?.warehouse?.reference },
        });
      }

      if (specificDate && (startDate || endDate)) {
        throw new BadRequestException(
          `You cannot choose a specific date and a start date or end date`,
        );
      }

      if (
        user.roles.some((role) => role === AgentRoles.PUS_COORDINATOR) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.TREASURY,
        )
      ) {
        deliveryMode = DeliveryMode.IN_AGENCY;
      }

      if (
        user.roles.some((role) => role === AgentRoles.FLEET_SUPERVISOR) &&
        !user.roles.some(
          (role) =>
            role === AgentRoles.LOGISTIC_MANAGER ||
            role === AgentRoles.ACCOUNTING ||
            role === AgentRoles.TREASURY,
        )
      ) {
        deliveryMode = DeliveryMode.AT_HOME;
      }

      return {
        storagePoint,
        agent,
        deliveryMode,
        startDate,
        endDate,
        specificDate,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetSalesReportService.name} - ${this._tryValidation.name} - `,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
