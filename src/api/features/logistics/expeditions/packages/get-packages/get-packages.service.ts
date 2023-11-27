import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  FROM_EMAIL,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { Delivery, Packages } from 'src/domain/entities/logistics';
import { DeliveryRepository } from 'src/repositories/logistics';
import { DeliveryStatus } from 'src/domain/enums/logistics';
import { AddDeliveryInput } from './dto';
import { OrderRepository } from 'src/repositories/orders';
import { Order } from 'src/domain/entities/orders';
import { AddInternalNeedService } from 'src/api/features/flows/internal-need/add-internal-need/add-internal-need.service';
import { USERS_RESOURCE } from 'src/domain/constants';
import { EmailInputModel } from 'src/domain/interfaces';
import { SendingEmailService } from 'src/services/email';
import { HttpService } from '@nestjs/axios';


type ValidationResult = {
  delivery: AddDeliveryInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetPackagesService {
  constructor(
    @InjectRepository(Packages)
    private readonly _packagesRepository: PackagesRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    private readonly _sendingEmailService: SendingEmailService,
    private readonly _httpService: HttpService,
  ) { }

  async GetPackages(
    input: Input,
    user: UserCon,
    accessToken: string,
  ): Promise<> {

    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      accessToken,
      validationResult,
    );
    if (!executionResult) {
      throw new HttpException(
        'Error Ocured During Execution',
        HttpStatus.CREATED,
      );
    }
    return executionResult;
  }

  private async _tryExecution(
    accessToken: string,
    result: ,
  ): Promise<> {


    try {
      // Set Delivery Status
      result.delivery.status = PackagesStatus.PENDING;

      // Send Notification To Delivery Agent
      const sendEmailTo: string[] = [];
      const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      await this._httpService.axiosRef
        .get(path + `?roles=${AgentRoles.WAREHOUSE_MANAGER}`, {
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

          response.data.items.map((item) => {
            if (item) {
              sendEmailTo.push(item.email);
            }
          });
        })
        .catch((error) => {
          throw new HttpException(
            error.message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        });

      sendEmailTo.unshift(result.user.email);

      if (sendEmailTo.length > 0) {
        console.log(`Send mail to ${sendEmailTo}`);

        const emailInput: EmailInputModel = {
          to: sendEmailTo,
          from: FROM_EMAIL,
          subject: 'Material Requisition Form',
        };

        try {
          await this._sendingEmailService.sendEmail(emailInput);
        } catch (error) {
          console.log(
            `Error sending email: ${error} - ${AddInternalNeedService.name} - ${this._tryExecution.name}`,
          );
        }
      }

      // Save Delivery Data To DB And Send Response To Frontend
      return await this._packagesRepository.save(result.packages);

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: ,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR;

      // Check For Null or White Space Values
      if (
        isNullOrWhiteSpace(input.orderId)
      ) {
        throw new BadRequestException(
          `OrderId is required`,
        );
      }

      if (
        isNullOrWhiteSpace(input.transportation)
      ) {
        throw new BadRequestException(
          `transportationMeans is required`,
        );
      }

      // Check If OrderId Exists
      const orderData = await this._orderRepository.findOne(input.orderId);
      if (!orderData) {
        throw new HttpException(`Order with id ${input.orderId} not found`, HttpStatus.NOT_FOUND);
      }

      return { packages: input, user, lang };
    } catch (error) {
      console.log('Here is todays message ', error.message);

      throw new BadRequestException("Validation failed");
    }

  }

}
