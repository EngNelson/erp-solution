import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { MiniLocationOutput } from 'src/domain/dto/warehouses';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { GetLocationByBarcodeInput } from './dto';

@Injectable()
export class GetLocationByBarcodeService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
  ) {}

  async getLocationByBarcode(
    input: GetLocationByBarcodeInput,
    user: UserCon,
  ): Promise<MiniLocationOutput> {
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
    input: GetLocationByBarcodeInput,
    user: UserCon,
  ): Promise<MiniLocationOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const location = await this._locationRepository.findOne({
        where: {
          barCode: input.barcode,
        },
      });
      if (!location) {
        throw new NotFoundException(
          `Location with barcode '${input.barcode}' not found`,
        );
      }

      return new MiniLocationOutput(location, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationByBarcodeService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
