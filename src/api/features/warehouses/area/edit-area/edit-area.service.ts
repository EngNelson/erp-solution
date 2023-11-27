import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { Area, StoragePoint } from 'src/domain/entities/warehouses';
import { AreaType } from 'src/domain/enums/warehouses';
import {
  AreaRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { EditAreaInput } from './dto';

type ValidationResult = {
  area: Area;
  storagePoint: StoragePoint;
  storagePointChanged: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditAreaService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
  ) {}

  async editArea(input: EditAreaInput, user: UserCon): Promise<AreaItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditAreaInput,
    result: ValidationResult,
  ): Promise<AreaItemOutput> {
    try {
      const { area, storagePoint, storagePointChanged, lang, user } = result;

      if (storagePointChanged) {
        area.storagePoint = storagePoint;
        area.storagePointId = storagePoint.id;
      } else {
        area.storagePoint = await this._storagePointRepository.findOne({
          where: { id: area.storagePointId },
          relations: ['storageType', 'address'],
        });
      }

      if (input.title && !isNullOrWhiteSpace(input.title)) {
        area.title = input.title;
      }

      if (input.description) {
        if (!area.description) {
          area.description = input.description;
        } else {
          const inputLangs = Object.keys(input.description);
          inputLangs.forEach(
            (l) => (area.description[l] = input.description[l]),
          );
        }
      }

      if (input.space) {
        area.space = input.space;
        area.surface = input.space.width * input.space.length;
        area.volume = input.space.height
          ? input.space.width * input.space.length * input.space.height
          : null;
      }

      area.isVirtual = input.isVirtual;
      area.updatedBy = user;

      await this._areaRepository.save(area);

      return new AreaItemOutput(area, lang);
    } catch (error) {
      throw new BadRequestException(
        `${EditAreaService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: EditAreaInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const { areaId, storagePointId, ...datas } = input;

      const area = await this._areaRepository.findOne({
        where: { id: areaId },
        relations: ['storagePoint', 'locations'],
      });
      if (!area) {
        throw new NotFoundException(`Area with id '${input.areaId}' not found`);
      }

      /**
       * Cannot edit DEFAULT area
       */
      if (area.type === AreaType.DEFAULT) {
        throw new BadRequestException(
          `Sorry you cannot edit ${area.type} area`,
        );
      }

      let storagePoint: StoragePoint;
      if (storagePointId && !isNullOrWhiteSpace(storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne({
          where: { id: input.storagePointId },
        });
        if (!storagePoint) {
          throw new NotFoundException(
            `Storage point with id '${storagePointId}' not found`,
          );
        }
      }

      return {
        area,
        storagePoint,
        storagePointChanged: !!storagePoint,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditAreaService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
