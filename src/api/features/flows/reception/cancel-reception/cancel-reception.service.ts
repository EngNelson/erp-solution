import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { Reception, VariantReception } from 'src/domain/entities/flows';
import { OperationLineState, OperationStatus } from 'src/domain/enums/flows';
import {
  ReceptionRepository,
  VariantReceptionRepository,
} from 'src/repositories/flows';
import { CancelReceptionInput } from './dto';
import { ReceptionService } from 'src/services/references/flows';

type ValidationResult = {
  reception: Reception;
  cancelWithChild: boolean;
  cancelReason: string;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class CancelReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(VariantReception)
    private readonly _variantReceptionRepository: VariantReceptionRepository,
    private readonly _receptionService: ReceptionService,
  ) {}

  async cancelReception(
    input: CancelReceptionInput,
    user: UserCon,
  ): Promise<ReceptionItemOutput> {
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
  ): Promise<ReceptionItemOutput> {
    try {
      const { reception, cancelWithChild, cancelReason, lang, user } = result;

      const receptionsToCancel: Reception[] = [];

      reception.status = OperationStatus.CANCELED;
      reception.cancelReason = cancelReason;
      reception.canceledBy = user;
      reception.canceledAt = new Date();

      /**
       * Cancel each variantReception
       */
      const variantsReceptionToCancel: VariantReception[] = [];

      reception.variantReceptions.map((variantReception) => {
        variantReception.state = OperationLineState.CANCELED;

        variantsReceptionToCancel.push(variantReception);
      });

      if (cancelWithChild && reception.child) {
        const child = await this._receptionRepository.findOne(
          reception.child.id,
          {
            relations: [
              'variantReceptions',
              'storagePoint',
              'parent',
              'child',
              'purchaseOrder',
              'mobileUnits',
              'productItems',
            ],
          },
        );

        child.status = OperationStatus.CANCELED;
        child.canceledBy = user;
        child.canceledAt = new Date();

        child.variantReceptions.map((childVariantReception) => {
          childVariantReception.state = OperationLineState.CANCELED;

          variantsReceptionToCancel.push(childVariantReception);
        });

        receptionsToCancel.push(child);
      }

      receptionsToCancel.push(reception);

      await this._variantReceptionRepository.save(variantsReceptionToCancel);
      await this._receptionRepository.save(receptionsToCancel);

      const receptionModel = await this._receptionService.buildReceptionOutput(
        reception,
      );

      return new ReceptionItemOutput(receptionModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${CancelReceptionService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: CancelReceptionInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const reception = await this._receptionRepository.findOne(
        input.receptionId,
        {
          relations: [
            'variantReceptions',
            'storagePoint',
            'parent',
            'child',
            'purchaseOrder',
            'mobileUnits',
            'productItems',
          ],
        },
      );

      if (!reception) {
        throw new NotFoundException(
          `Reception with id '${input.receptionId}' not found`,
        );
      }

      if (reception.status === OperationStatus.CANCELED) {
        throw new BadRequestException(
          `The reception ${reception.reference} has already been cancelled by ${reception.canceledBy.lastname}`,
        );
      }

      /**
       * Canot cancel VALIDATED reception
       */
      if (reception.status === OperationStatus.VALIDATED) {
        throw new BadRequestException(
          `You cannot cancel a ${OperationStatus.VALIDATED} reception`,
        );
      }

      return {
        reception,
        cancelWithChild: input.cancelWithChild,
        cancelReason: input.cancelReason,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${CancelReceptionService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
