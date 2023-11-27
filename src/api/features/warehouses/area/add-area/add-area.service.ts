import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { AddAreaInput } from './dto';
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { Area, StoragePoint } from 'src/domain/entities/warehouses';
import {
  AreaRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { AreaReferenceService } from 'src/services/references/warehouses';

type ValidationResult = {
  storagePoint: StoragePoint;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddAreaService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    private readonly _areaReferenceService: AreaReferenceService,
  ) {}

  async addArea(input: AddAreaInput, user: UserCon): Promise<AreaItemOutput> {
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
    input: AddAreaInput,
    result: ValidationResult,
  ): Promise<AreaItemOutput> {
    const area = new Area();

    try {
      const { storagePoint, lang, user } = result;

      area.reference = await this._areaReferenceService.generate();
      area.title = input.title;
      area.description = input.description ? input.description : null;
      area.storagePoint = storagePoint;
      area.storagePointId = storagePoint.id;
      area.space = input.space ? input.space : null;
      area.surface = input.space
        ? input.space.width * input.space.length
        : null;
      area.volume =
        input.space && input.space.height
          ? area.surface * input.space.height
          : null;
      area.isVirtual = input.isVirtual;
      area.createdBy = user;

      await this._areaRepository.save(area);

      return new AreaItemOutput(area, lang);
    } catch (error) {
      if (area.id) {
        await this._storagePointRepository.delete(area.id);
      }
      throw new ConflictException(
        `${AddAreaService.name} - ${this._tryExecution.name}` + error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddAreaInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne({
        where: { id: input.storagePointId },
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${input.storagePointId}' not found`,
        );
      }

      /**
       * We verify that we don't have an area
       * with the same name in the same warehouse
       */
      const isInputAreaTitleExist = await this._areaRepository.findOne({
        where: { title: input.title, storagePointId: storagePoint.id },
      });

      if (isInputAreaTitleExist) {
        throw new ConflictException(
          `Another area with the title ${input.title} already exist in ${storagePoint.name} warehouse`,
        );
      }

      return { storagePoint, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${AddAreaService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
