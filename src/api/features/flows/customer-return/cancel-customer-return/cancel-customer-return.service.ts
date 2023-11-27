import { ISOLang, UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerReturnItemOutput } from 'src/domain/dto/flows';
import { CommentModel } from 'src/domain/interfaces';
import { CancelCustomerReturnInput } from './dto';
import { CustomerReturnRepository } from 'src/repositories/flows';
import { CustomerReturnState } from 'src/domain/enums/flows';
import { CustomerReturn } from 'src/domain/entities/flows';
import { CustomerReturnService } from 'src/services/generals';

type ValidationResult = {
  customerReturn: CustomerReturn;
  comments: CommentModel[];
  isNewComment: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelCustomerReturnService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    private readonly _customerReturnService: CustomerReturnService,
  ) {}

  async cancelCustomerReturn(
    input: CancelCustomerReturnInput,
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
    result: ValidationResult,
  ): Promise<CustomerReturnItemOutput> {
    try {
      const { customerReturn, comments, isNewComment, lang, user } = result;

      customerReturn.state = CustomerReturnState.CANCELED;
      if (isNewComment) {
        customerReturn.comments = comments;
      }
      customerReturn.canceledAt = new Date();
      customerReturn.canceledBy = user;

      await this._customerReturnRepository.save(customerReturn);

      return new CustomerReturnItemOutput(customerReturn, lang);
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${CancelCustomerReturnService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: CancelCustomerReturnInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /*
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
          `Customer Return with id '${input.customerReturnId}' is not found`,
        );
      }

      if (customerReturn.state !== CustomerReturnState.SAVED) {
        throw new BadRequestException(
          `Cannot cancel ${customerReturn.state} customer return. Only ${CustomerReturnState.SAVED} customer return can be canceled.`,
        );
      }

      let comments: CommentModel[] = [];
      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        comments = this._customerReturnService.buildCustomerReturnComments(
          customerReturn,
          input.comment,
          user,
        );
      }

      return {
        customerReturn,
        comments,
        isNewComment: !!input.comment,
        lang,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${CancelCustomerReturnService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
