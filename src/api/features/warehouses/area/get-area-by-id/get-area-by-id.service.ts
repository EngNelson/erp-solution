import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { Area, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { GetAreaByIdInput } from './dto';

@Injectable()
export class GetAreaByIdService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getAreaById(
    input: GetAreaByIdInput,
    user: UserCon,
  ): Promise<AreaItemOutput> {
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
    input: GetAreaByIdInput,
    user: UserCon,
  ): Promise<AreaItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const area = await this._areaRepository.findOne({
        where: { id: input.id },
        relations: ['locations'],
      });
      if (!area) {
        throw new NotFoundException(`Area with id '${input.id}' not found`);
      }

      area.storagePoint = await this._storagePointRepository.findOne({
        where: { id: area.storagePointId },
        relations: ['address'],
      });

      return new AreaItemOutput(area, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetAreaByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
