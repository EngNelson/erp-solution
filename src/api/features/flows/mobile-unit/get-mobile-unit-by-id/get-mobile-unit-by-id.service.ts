import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { MobileUnitItemOutput } from 'src/domain/dto/flows';
import { MobileUnit } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';
import { Location } from 'src/domain/entities/warehouses';
import { MobileUnitRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SupplierRepository } from 'src/repositories/purchases';
import { LocationRepository } from 'src/repositories/warehouses';
import { GetMobileUnitByIdInput } from './dto';
import { MobileUnitService } from 'src/services/generals';

@Injectable()
export class GetMobileUnitByIdService {
  constructor(
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _mobileUnitService: MobileUnitService,
  ) {}

  async getMobileUnitById(
    input: GetMobileUnitByIdInput,
    user: UserCon,
  ): Promise<MobileUnitItemOutput> {
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
    input: GetMobileUnitByIdInput,
    user: UserCon,
  ): Promise<MobileUnitItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const mobileUnit = await this._mobileUnitRepository.findOne(
        input.mobileUnitId,
        { relations: ['productItems', 'transfert'] },
      );

      if (!mobileUnit) {
        throw new NotFoundException(
          `Mobile unit with id '${input.mobileUnitId}' not found`,
        );
      }

      /**
       * Check if mobile unit has password
       * and validate the input one
       */
      if (!isNullOrWhiteSpace(mobileUnit.password)) {
        if (!isNullOrWhiteSpace(input.password)) {
          if (input.password !== mobileUnit.password) {
            throw new UnauthorizedException(`Invalid mobile unit password`);
          }
        } else {
          throw new UnauthorizedException(
            `Please provide the mobile unit password`,
          );
        }
      }

      await Promise.all(
        mobileUnit.productItems.map(async (productItem) => {
          productItem.productVariant =
            await this._productVariantRepository.findOne(
              productItem.productVariantId,
            );
          productItem.location = await this._locationRepository.findOne(
            productItem.locationId,
          );
          productItem.supplier = await this._supplierRepository.findOne(
            productItem.supplierId,
          );

          return productItem;
        }),
      );

      const mobileUnitModel =
        await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

      return new MobileUnitItemOutput(mobileUnitModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetMobileUnitByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
