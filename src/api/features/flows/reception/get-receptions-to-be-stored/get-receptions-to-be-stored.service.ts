import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { MiniReceptionOutput } from 'src/domain/dto/flows';
import { MobileUnit, Reception } from 'src/domain/entities/flows';
import { ProductItem } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationStatus,
  ReceptionType,
  StepStatus,
} from 'src/domain/enums/flows';
import {
  MobileUnitRepository,
  ReceptionRepository,
} from 'src/repositories/flows';
import { StoragePointRepository } from 'src/repositories/warehouses';
import {
  GetReceptionsToBeStoredInput,
  GetReceptionsToBeStoredOutput,
} from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  isStoragePoint: boolean;
  lang?: ISOLang;
};

type WhereClause = {
  status: OperationStatus;
  type?: ReceptionType;
  storagePointId?: string;
}[];

@Injectable()
export class GetReceptionsToBeStoredService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptonRepository: ReceptionRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
  ) {}

  async getReceptionsToBeStored(
    input: GetReceptionsToBeStoredInput,
    user: UserCon,
  ): Promise<GetReceptionsToBeStoredOutput> {
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
  ): Promise<GetReceptionsToBeStoredOutput> {
    try {
      const { storagePoint, isStoragePoint, lang } = result;

      const whereClause: WhereClause = [
        { status: OperationStatus.VALIDATED },
        { status: OperationStatus.PENDING, type: ReceptionType.TRANSFERT },
      ];
      if (isStoragePoint) {
        whereClause.map((clause) => {
          clause.storagePointId = storagePoint.id;
          return clause;
        });
      }

      console.log(whereClause);

      const receptionsToBeStored = await this._receptonRepository.find({
        where: whereClause,
        relations: ['storagePoint', 'child', 'productItems', 'mobileUnits'],
        order: { createdAt: 'ASC' },
      });

      // console.log(receptionsToBeStored);

      const receptionsOutput: Reception[] = [];

      await Promise.all(
        receptionsToBeStored.map(async (reception) => {
          if (reception.child) {
            reception.child = await this._receptonRepository.findOne(
              reception.child.id,
              { relations: ['storagePoint'] },
            );
          }

          // filter only reception to be stored
          let itemsToBeStored: ProductItem[] = [];

          itemsToBeStored = reception.productItems.filter(
            (productItem) => productItem.status === StepStatus.TO_STORE,
          );

          /**
           * receptionType = TRANSFERT
           */
          // if (reception.type === ReceptionType.TRANSFERT) {
          //   itemsToBeStored = reception.productItems.filter(
          //     (productItem) =>
          //       productItem.status === StepStatus.TO_STORE ||
          //       productItem.status === StepStatus.TO_PICK_PACK,
          //   );
          // }

          /**
           * receptionType = PURCHASE_ORDER
           */
          // if (reception.type === ReceptionType.PURCHASE_ORDER) {
          //   itemsToBeStored = reception.productItems.filter(
          //     (productItem) =>
          //       productItem.status === StepStatus.TO_STORE ||
          //       productItem.status === StepStatus.TO_PICK_PACK,
          //   );
          // }

          /**
           * receptionType = DELIVERY_FAILURE or CANCELED_IP or REJET_CLIENT or PURCHASE_ORDER
           */
          // if (
          //   reception.type === ReceptionType.DELIVERY_FAILURE ||
          //   reception.type === ReceptionType.CANCELED_IP ||
          //   reception.type === ReceptionType.REJET_CLIENT ||
          //   reception.type === ReceptionType.PURCHASE_ORDER
          // ) {
          //   itemsToBeStored = reception.productItems.filter(
          //     (productItem) =>
          //       productItem.status === StepStatus.TO_STORE ||
          //       productItem.status === StepStatus.TO_PICK_PACK,
          //   );
          // }

          if (itemsToBeStored.length > 0) receptionsOutput.push(reception);
        }),
      );

      // console.log(receptionsOutput);

      return new GetReceptionsToBeStoredOutput(
        receptionsOutput.map((reception) => new MiniReceptionOutput(reception)),
        receptionsOutput.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetReceptionsToBeStoredService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetReceptionsToBeStoredInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      let storagePoint: StoragePoint;

      if (
        !isNullOrWhiteSpace(input.storagePointRef) &&
        input.storagePointRef !== 'null'
      ) {
        storagePoint = await this._storagePointRepository.findOne({
          reference: input.storagePointRef,
        });

        if (!storagePoint) {
          throw new NotFoundException(
            `StoragePoint with reference '${input.storagePointRef}' not found`,
          );
        }
      }

      return { storagePoint, isStoragePoint: !!storagePoint, lang };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetReceptionsToBeStoredService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
