import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { Delivery } from 'src/domain/entities/logistics';
import { DeliveryRepository } from 'src/repositories/logistics';
import { AssignDeliveryInput } from './dto';
import { HttpService } from '@nestjs/axios';


type ValidationResult = {
  input: AssignDeliveryInput;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AssignDeliveryService {
  constructor(
    @InjectRepository(Delivery)
    private readonly _deliveryRepository: DeliveryRepository,
    private readonly _httpService: HttpService,
  ) { }

  async assignDelivery(
    input: AssignDeliveryInput,
    user: UserCon,
    accessToken: string,
  ): Promise<AssignDeliveryInput> {

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
    result: ValidationResult,
  ): Promise<any> {

    try {
      // Send Notification To Delivery Agent
      // const sendEmailTo: string[] = [];
      // const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      // await this._httpService.axiosRef
      //   .get(path + `?roles=${AgentRoles.WAREHOUSE_MANAGER}`, {
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

      // sendEmailTo.unshift(result.user.email);

      // if (sendEmailTo.length > 0) {
      //   console.log(`Send mail to ${sendEmailTo}`);

      //   const emailInput: EmailInputModel = {
      //     to: sendEmailTo,
      //     from: FROM_EMAIL,
      //     subject: 'Material Requisition Form',
      //   };

      //   try {
      //     await this._sendingEmailService.sendEmail(emailInput);
      //   } catch (error) {
      //     console.log(
      //       `Error sending email: ${error} - ${AddInternalNeedService.name} - ${this._tryExecution.name}`,
      //     );
      //   }
      // }

      const res = await this._deliveryRepository.update(result.input.deliveryId, { agentId: result.input.agentId })

      return res;

    } catch (error) {
      throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async _tryValidation(
    input: AssignDeliveryInput,
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
        isNullOrWhiteSpace(input.deliveryId)
      ) {
        throw new BadRequestException(
          `DeliveryId is required`,
        );
      }

      if (
        isNullOrWhiteSpace(input.agentId)
      ) {
        throw new BadRequestException(
          `agentId is required`,
        );
      }

      // Check If deliveryId Exists
      const deliveryData = await this._deliveryRepository.findOne(input.deliveryId);
      if (!deliveryData) {
        throw new HttpException(`Order with id ${input.deliveryId} not found`, HttpStatus.NOT_FOUND);
      }

      return { input: input, user, lang };
    } catch (error) {
      throw new BadRequestException("Validation failed");
    }

  }

}
