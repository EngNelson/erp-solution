import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { StoragePointItemOutput } from 'src/domain/dto/warehouses';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetStoragePointByIdInput } from './dto';

@Injectable()
export class GetStoragePointByIdService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getStoragePointById(
    input: GetStoragePointByIdInput,
    user: UserCon,
  ): Promise<StoragePointItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException('Error occured during execution', HttpStatus.OK);
    }

    return result;
  }

  private async _tryExecution(
    input: GetStoragePointByIdInput,
    user: UserCon,
  ): Promise<StoragePointItemOutput> {
    try {
      const lang = input.lang ? input.lang : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne({
        where: { id: input.id },
        relations: ['address'],
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${input.id}' not found`,
        );
      }

      return new StoragePointItemOutput(storagePoint, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
