import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetStoragePointByReferenceInput } from './dto';

@Injectable()
export class GetStoragePointByReferenceService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getStoragePointByReference(
    input: GetStoragePointByReferenceInput,
    user: UserCon,
  ): Promise<MiniStoragePointOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException('Error occured during execution', HttpStatus.OK);
    }

    return result;
  }

  private async _tryExecution(
    input: GetStoragePointByReferenceInput,
    user: UserCon,
  ): Promise<MiniStoragePointOutput> {
    try {
      const lang = input.lang ? input.lang : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne({
        where: { reference: input.reference },
        relations: ['address'],
      });

      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with reference '${input.reference}' not found`,
        );
      }

      return new MiniStoragePointOutput(storagePoint);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetStoragePointByReferenceService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
