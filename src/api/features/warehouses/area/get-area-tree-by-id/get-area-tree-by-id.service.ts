import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang } from '@glosuite/shared';
import { AreaTreeOutput } from 'src/domain/dto/warehouses';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { GetAreaTreeByIdInput } from './dto';

type ValidationResult = {
  area: Area;
  lang: ISOLang;
};

@Injectable()
export class GetAreaTreeByIdService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async getAreaTreeById(input: GetAreaTreeByIdInput): Promise<AreaTreeOutput> {
    const validationResult = await this._tryValidation(input);

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
  ): Promise<AreaTreeOutput> {
    try {
      const { area, lang } = result;

      const locations: Location[] = [];

      if (area.locations && area.locations.length > 0) {
        for (const location of area.locations) {
          const children =
            await this._locationTreeRepository.findDescendantsTree(location);

          if (children.id !== location.id) location.children.push(children);
          locations.push(location);
        }
      }

      area.locations = locations;

      return new AreaTreeOutput(area, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetAreaTreeByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: GetAreaTreeByIdInput,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang ? input.lang : ISOLang.FR;

      const area = await this._areaRepository.findOne({
        where: { id: input.areaId },
        relations: ['locations'],
      });
      if (!area) {
        throw new NotFoundException(`Area with id '${input.areaId}' not found`);
      }

      area.storagePoint = await this._storagePointRepository.findOne({
        where: { id: area.storagePointId },
        relations: ['address'],
      });

      return { area, lang };
    } catch (error) {
      throw new BadRequestException(
        `${GetAreaTreeByIdService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
