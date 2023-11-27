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
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderProcessing, StockMovement } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { Area, Location } from 'src/domain/entities/warehouses';
import { MiniUserPayload } from 'src/domain/interfaces';
import {
  OrderProcessingRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import { ProductItemRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import {
  AreaRepository,
  LocationRepository,
} from 'src/repositories/warehouses';
import { ValidateOutputInput, ValidateOutputOutput } from './dto';
import { MiniOrderOutput } from 'src/domain/dto/orders';
import {
  MovementType,
  StepStatus,
  StockMovementAreaType,
  TriggerType,
  TriggeredBy,
} from 'src/domain/enums/flows';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';
import { DeliveryMode, OrderStep, OrderVersion } from 'src/domain/enums/orders';
import {
  AreaDefaultType,
  LocationDefaultType,
} from 'src/domain/enums/warehouses';
import { OrderReferenceService } from 'src/services/references/orders';
import {
  AdvanceHistoryStatus,
  PaymentMode,
  PaymentStatus,
} from 'src/domain/enums/finance';

type ValidationResult = {
  orders: Order[];
  outputBy: MiniUserPayload;
  defaultFleetLocation: Location;
  defaultPusLocation: Location;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateOutputService {
  constructor(
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(OrderProcessing)
    private readonly _orderProcessingRepository: OrderProcessingRepository,
    private readonly _httpService: HttpService,
    private readonly _orderReferenceService: OrderReferenceService,
  ) {}

  async validateOutput(
    input: ValidateOutputInput,
    user: UserCon,
    accessToken: string,
  ): Promise<ValidateOutputOutput> {
    const validationResult = await this._tryValidation(
      input,
      user,
      accessToken,
    );

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult, input);

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
    input: ValidateOutputInput,
  ): Promise<ValidateOutputOutput> {
    try {
      const {
        orders,
        outputBy,
        defaultFleetLocation,
        defaultPusLocation,
        lang,
        user,
      } = result;

      /**
       * 1. If FLEET:
       ******* set order orderStatus to TO_DELIVER
       ******* set each item status to TO_DELIVER
       ******* create stockMovement for each item
       ******* (from PREPATION to FLEET)
       ******* set locations totalItems
       ******* set each item location to FLEET location
       * 2. If PUS:
       * ***** set order orderStatus to PICKED_UP
       * ***** set each item status to PICKED_UP
       * ***** create stockMovement for each item
       * ***** (from PREPATION to PUS)
       * ***** set locations totalItems
       * ***** set each item location to PUS location
       */
      const productItemsToUpdate: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const orderProcessingsToAdd: OrderProcessing[] = [];
      const ordersToEdit: Order[] = [];

      for (const order of orders) {
        console.log(`Start ${order.reference} order treatment`);
        order.outputById = input.outputById;
        order.outputBy = outputBy;

        // End the previous order processing
        const actualState = order.orderStep;
        const actualStatus = order.orderStatus;

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
          orderProcessingsToAdd.push(lastOrderProcessing);
        }

        // 1. If FLEET
        if (order.deliveryMode === DeliveryMode.AT_HOME) {
          // set order orderStatus to TO_DELIVER
          // set order orderStep to DELIVERY_TREATMENT
          order.orderStatus = StepStatus.TO_DELIVER;
          order.orderStep = OrderStep.DELIVERY_TREATMENT;

          // Start a new order processing
          const startOrderProcessing = new OrderProcessing();

          startOrderProcessing.reference =
            await this._orderReferenceService.generateOrderProcessingReference(
              order,
            );
          startOrderProcessing.state = order.orderStep;
          startOrderProcessing.status = order.orderStatus;
          startOrderProcessing.startDate = new Date();
          startOrderProcessing.order = order;
          startOrderProcessing.orderId = order.id;

          console.log(
            `Save order processing for order ${order.id}. ${order.deliveryMode}`,
          );

          // orderProcessingsToAdd.push(startOrderProcessing);
          await this._orderProcessingRepository.save(startOrderProcessing);

          order.orderProcessings.push(startOrderProcessing);

          for (const productItem of order.productItems) {
            // set each item status to TO_DELIVER
            productItem.status = StepStatus.TO_DELIVER;

            const sourceLocation = await this._locationRepository.findOne({
              where: { id: productItem.locationId },
            });

            // create stockMovement for each item
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.INTERNAL;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.VALIDATE_OUTPUT;
            stockMovement.createdBy = user;

            stockMovement.productItem = productItem;
            stockMovement.productItemId = productItem.id;

            stockMovement.order = order;
            stockMovement.orderId = order.id;

            stockMovement.sourceType = StockMovementAreaType.LOCATION;
            stockMovement.targetType = StockMovementAreaType.LOCATION;

            stockMovement.sourceLocation = sourceLocation;
            stockMovement.sourceLocationId = productItem.locationId;

            stockMovement.targetLocation = defaultFleetLocation;
            stockMovement.targetLocationId = defaultFleetLocation.id;

            stockMovementsToAdd.push(stockMovement);

            // set locations totalItems
            sourceLocation.totalItems -= 1;

            await this._locationRepository.save(sourceLocation);

            // set each item location to FLEET location
            productItem.location = defaultFleetLocation;
            productItem.locationId = defaultFleetLocation.id;

            defaultFleetLocation.totalItems += 1;

            await this._locationRepository.save(defaultFleetLocation);

            productItemsToUpdate.push(productItem);
          }
        } else if (order.deliveryMode === DeliveryMode.IN_AGENCY) {
          // 2. If PUS
          // set order orderStatus to PICKED_UP
          order.orderStatus = StepStatus.PICKED_UP;
          order.orderStep = OrderStep.PENDING_WITHDRAWAL;

          // Start a new order processing
          const startOrderProcessing = new OrderProcessing();

          startOrderProcessing.reference =
            await this._orderReferenceService.generateOrderProcessingReference(
              order,
            );
          startOrderProcessing.state = order.orderStep;
          startOrderProcessing.status = order.orderStatus;
          startOrderProcessing.startDate = new Date();
          startOrderProcessing.order = order;
          startOrderProcessing.orderId = order.id;

          // orderProcessingsToAdd.push(startOrderProcessing);
          await this._orderProcessingRepository.save(startOrderProcessing);

          order.orderProcessings.push(startOrderProcessing);

          for (const productItem of order.productItems) {
            // set each item status to PICKED_UP
            productItem.status = StepStatus.PICKED_UP;

            const sourceLocation = await this._locationRepository.findOne({
              where: { id: productItem.locationId },
            });

            // create stockMovement for each item
            const stockMovement = new StockMovement();

            stockMovement.movementType = MovementType.INTERNAL;
            stockMovement.triggerType = TriggerType.AUTO;
            stockMovement.triggeredBy = TriggeredBy.VALIDATE_OUTPUT;
            stockMovement.createdBy = user;

            stockMovement.productItem = productItem;
            stockMovement.productItemId = productItem.id;

            stockMovement.order = order;
            stockMovement.orderId = order.id;

            stockMovement.sourceType = StockMovementAreaType.LOCATION;
            stockMovement.targetType = StockMovementAreaType.LOCATION;

            stockMovement.sourceLocation = sourceLocation;
            stockMovement.sourceLocationId = productItem.locationId;

            stockMovement.targetLocation = defaultPusLocation;
            stockMovement.targetLocationId = defaultPusLocation.id;

            stockMovementsToAdd.push(stockMovement);

            // set locations totalItems
            sourceLocation.totalItems -= 1;
            await this._locationRepository.save(sourceLocation);

            // set each item location to PUS location
            productItem.location = defaultPusLocation;
            productItem.locationId = defaultPusLocation.id;

            defaultPusLocation.totalItems += 1;
            await this._locationRepository.save(defaultPusLocation);

            productItemsToUpdate.push(productItem);
          }
        }

        ordersToEdit.push(order);
      }

      await this._productItemRepository.save(productItemsToUpdate);
      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._orderProcessingRepository.save(orderProcessingsToAdd);

      await this._orderRepository.save(ordersToEdit);

      return new ValidateOutputOutput(
        orders.map((order) => new MiniOrderOutput(order)),
        orders.length,
      );
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${ValidateOutputService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: ValidateOutputInput,
    user: UserCon,
    accessToken: string,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      // Get orders to output
      const orders: Order[] = [];

      await Promise.all(
        input.orderBarcodes.map(async (barcode) => {
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

          if (order.version !== OrderVersion.CURRENT) {
            throw new BadRequestException(
              `You cannot validate the output of a ${order.version} order`,
            );
          }

          if (
            order.prepaidIsRequired &&
            order.paymentStatus === PaymentStatus.UNPAID &&
            (order.paymentMode !== PaymentMode.ADVANCE_PAYMENT ||
              !order.advance.history.find(
                (item) => item.status === AdvanceHistoryStatus.PAID,
              ))
          ) {
            throw new BadRequestException(
              `The order ${order.reference} required a prepaid. Please add a payment or an advance to the order`,
            );
          }

          orders.push(order);
        }),
      );

      if (orders.some((order) => order.orderStatus !== StepStatus.READY)) {
        throw new BadRequestException(
          `Some orders you are trying to output are not ${StepStatus.READY}`,
        );
      }

      /**
       * Restrictions
       */
      if (
        !user.workStation.warehouse ||
        (orders.some(
          (order) =>
            user.workStation.warehouse.reference !==
            order.storagePoint.reference,
        ) &&
          !user.roles.some((role) => role === AgentRoles.WAREHOUSE_MANAGER))
      ) {
        throw new UnauthorizedException(
          `Some orders you are trying to output have not in the warehouse you are working in.`,
        );
      }

      /**
       * Get the fleet/pus agent from auth microservice if exists
       */
      let outputBy: MiniUserPayload;

      if (!isNullOrWhiteSpace(input.outputById)) {
        // Get the user from auth microservice
        const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
        console.log('AUTH ENDPOINT ', path);

        await this._httpService.axiosRef
          .get(path + `/${input.outputById}`, {
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

            outputBy = {
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

      // const path = `${process.env.AUTH_API_PATH}/${USER_AUTH_RESOURCE}`;
      // console.log('USER AUTH ENDPOINT ', path);

      // const userAuthData: UserAuthData = {
      //   userId: input.outputBy,
      //   password: input.agentPassword,
      // };

      // await this._httpService.axiosRef
      //   .post(path, userAuthData, {
      //     headers: {
      //       Authorization: `Bearer ${accessToken}`,
      //       'Accept-Encoding': 'gzip,deflate,compress',
      //     },
      //   })
      //   .then((response) => {
      //     console.log(
      //       `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
      //       'Data ',
      //       response.data,
      //     );

      //     if (
      //       !response.data.roles.some(
      //         (role) =>
      //           role === AgentRoles.FLEET_SUPERVISOR ||
      //           role === AgentRoles.DELIVER_AGENT ||
      //           role === AgentRoles.PUS_AGENT ||
      //           role === AgentRoles.PUS_COORDINATOR ||
      //           role === AgentRoles.PUS_MANAGER ||
      //           role === AgentRoles.LOGISTIC_MANAGER,
      //       )
      //     ) {
      //       throw new UnauthorizedException(
      //         `This agent is not authorized to output
      //          this command`,
      //       );
      //     }

      //     outputBy = {
      //       firstname: response.data.firstname ? response.data.firstname : null,
      //       lastname: response.data.lastname,
      //       email: response.data.email,
      //     };
      //   })
      //   .catch((error) => {
      //     throw new HttpException(
      //       error.message,
      //       HttpStatus.INTERNAL_SERVER_ERROR,
      //     );
      //   });

      // get default Fleet and Pus locations
      const defaultOutputArea = await this._areaRepository.findOne({
        where: {
          storagePointId: orders[0].storagePointId,
          defaultType: AreaDefaultType.OUTPUT,
        },
      });

      if (!defaultOutputArea) {
        throw new InternalServerErrorException(
          `The warehouse ${orders[0].storagePoint.name} does not have an output area`,
        );
      }

      const defaultFleetLocation = await this._locationRepository.findOne({
        where: {
          areaId: defaultOutputArea.id,
          defaultType: LocationDefaultType.FLEET,
        },
      });

      if (!defaultFleetLocation) {
        throw new InternalServerErrorException(
          `The warehouse ${orders[0].storagePoint.name} does not have a FLEET location`,
        );
      }

      const defaultPusLocation = await this._locationRepository.findOne({
        where: {
          areaId: defaultOutputArea.id,
          defaultType: LocationDefaultType.PUS,
        },
      });

      if (!defaultPusLocation) {
        throw new InternalServerErrorException(
          `The warehouse ${orders[0].storagePoint.name} does not have a PUS location`,
        );
      }

      return {
        orders,
        outputBy,
        defaultFleetLocation,
        defaultPusLocation,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ValidateOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
