import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { CustomerReturn } from 'src/domain/entities/flows';
import {
  CustomerReturnState,
  CustomerReturnStatus,
} from 'src/domain/enums/flows';
import { CommentModel } from 'src/domain/interfaces';
import { CustomerReturnRepository } from 'src/repositories/flows';
import { CustomerReturnService } from 'src/services/generals';
import { ResolveCustomerReturnInput } from './dto';

type validationResult = {
  customerReturn: CustomerReturn;
  comments: CommentModel[];
  isNewComment: boolean;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class ResolveCustomerReturnService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    private readonly _customerReturnService: CustomerReturnService,
  ) {}

  async resolveCustomerReturn(
    input: ResolveCustomerReturnInput,
    user: UserCon,
  ): Promise<CustomerReturnItemOutput> {
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
    result: validationResult,
  ): Promise<CustomerReturnItemOutput> {
    try {
      const { customerReturn, comments, isNewComment, user, lang } = result;

      customerReturn.status = CustomerReturnStatus.RESOLVED;
      customerReturn.resolvedAt = new Date();
      customerReturn.resolvedBy = user;

      if (isNewComment) {
        customerReturn.comments = comments;
      }

      await this._customerReturnRepository.save(customerReturn);

      return new CustomerReturnItemOutput(customerReturn, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ResolveCustomerReturnService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: ResolveCustomerReturnInput,
    user: UserCon,
  ): Promise<validationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get customerReturn
       */
      const customerReturn = await this._customerReturnRepository.findOne({
        where: {
          id: input.customerReturnId,
          relations: [
            'stockMovements',
            'reception',
            'productItems',
            'storagePoint',
            'order',
          ],
        },
      });

      if (!customerReturn) {
        throw new NotFoundException(
          `Customer return '${input.customerReturnId}' not found`,
        );
      }

      /**
       * Customer return state validation
       */
      if (customerReturn.state !== CustomerReturnState.VALIDATED) {
        throw new BadRequestException(
          `Can only resolved ${CustomerReturnState.VALIDATED} customer return`,
        );
      }

      /**
       * Customer return user storage-point validation
       */
      if (
        user.workStation?.warehouse &&
        user.workStation.warehouse.reference !==
          customerReturn.storagePoint.reference
      ) {
        throw new UnauthorizedException(
          `You are not authorized to validate this customer return since you are not in ${customerReturn.storagePoint.name}`,
        );
      }

      let comments: CommentModel[] = [];
      if (input.newComment && !isNullOrWhiteSpace(input.newComment)) {
        comments = this._customerReturnService.buildCustomerReturnComments(
          customerReturn,
          input.newComment,
          user,
        );
      }

      return {
        customerReturn,
        comments,
        isNewComment:
          !!input.newComment && !isNullOrWhiteSpace(input.newComment),
        user,
        lang,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${ResolveCustomerReturnService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
