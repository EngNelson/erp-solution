import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { LocationItemOutput } from 'src/domain/dto/warehouses';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';
import { GetLocationByIdInput } from './dto';

@Injectable()
export class GetLocationByIdService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
  ) {}

  async getLocationById(
    input: GetLocationByIdInput,
    user: UserCon,
  ): Promise<LocationItemOutput> {
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
    input: GetLocationByIdInput,
    user: UserCon,
  ): Promise<LocationItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const location = await this._locationRepository.findOne({
        where: { id: input.id },
        relations: ['area', 'parentLocation', 'children', 'productItems'],
      });
      if (!location) {
        throw new NotFoundException(`Location not found`);
      }

      let totalVariants = 0;
      const variantIds: string[] = [];
      location.productItems.map((item) => {
        if (
          !variantIds.some((variantId) => variantId === item.productVariantId)
        ) {
          variantIds.push(item.productVariantId);
          totalVariants++;
        }
      });

      return new LocationItemOutput(location, totalVariants, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetLocationByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
