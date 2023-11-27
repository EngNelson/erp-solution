import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { OtherOutput } from 'src/domain/entities/flows';
import { OtherOutputRepository } from 'src/repositories/flows';
import { OtherOutputService } from 'src/services/generals';
import { GetOtherOutputByIdInput } from './dto';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';

@Injectable()
export class GetOtherOutputByIdService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _otherOutputService: OtherOutputService,
  ) {}

  async getOtherOutputById(
    input: GetOtherOutputByIdInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: GetOtherOutputByIdInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const otherOutput = await this._otherOutputRepository.findOne(
        input.otherOutputId,
        {
          relations: [
            'storagePoint',
            'variantsToOutput',
            'productItems',
            'stockMovements',
            'child',
            'parent',
          ],
        },
      );

      if (!otherOutput) {
        throw new NotFoundException(
          `Output with id '${input.otherOutputId}' is not found`,
        );
      }

      if (otherOutput.child) {
        otherOutput.child.storagePoint =
          await this._storagePointRepository.findOne({
            where: { id: otherOutput.child.storagePointId },
          });
      }

      const otherOutputModel =
        await this._otherOutputService.buildOtherOutputOutput(otherOutput);

      return new OtherOutputItemOutput(otherOutputModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetOtherOutputByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
