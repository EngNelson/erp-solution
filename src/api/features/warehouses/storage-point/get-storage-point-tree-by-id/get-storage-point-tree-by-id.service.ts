import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang } from '@glosuite/shared';
import { StoragePointTreeOutput } from 'src/domain/dto/warehouses';
import { Location, StoragePoint } from 'src/domain/entities/warehouses';
import {
  LocationRepository,
  LocationTreeRepository,
  StoragePointRepository,
} from 'src/repositories/warehouses';
import { GetStoragePointTreeByIdInput } from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  lang: ISOLang;
};

@Injectable()
export class GetStoragePointTreeByIdService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
  ) {}

  async getStoragePointTreeById(
    input: GetStoragePointTreeByIdInput,
  ): Promise<StoragePointTreeOutput> {
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
  ): Promise<StoragePointTreeOutput> {
    try {
      const { storagePoint, lang } = result;

      await Promise.all(
        storagePoint.areas?.map(async (area) => {
          // console.log(area);

          const locations = await this._locationRepository.find({
            where: {
              areaId: area.id,
            },
          });

          await Promise.all(
            locations?.map(async (location) => {
              const locationTree =
                await this._locationTreeRepository.findDescendantsTree(
                  location,
                );
              if (locationTree.id !== location.id)
                location.children.push(locationTree);
            }),
          );

          area.locations = locations;
        }),
      );

      return new StoragePointTreeOutput(storagePoint, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointTreeByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: GetStoragePointTreeByIdInput,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang ? input.lang : ISOLang.FR;

      const storagePoint = await this._storagePointRepository.findOne({
        where: {
          id: input.storagePointId,
        },
        relations: ['areas', 'address'],
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${input.storagePointId}' not found`,
        );
      }

      return { storagePoint, lang };
    } catch (error) {
      throw new BadRequestException(
        `${GetStoragePointTreeByIdService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
