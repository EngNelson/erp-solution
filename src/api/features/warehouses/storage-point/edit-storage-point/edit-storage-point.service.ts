import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { StoragePointItemOutput } from 'src/domain/dto/warehouses';
import { Address } from 'src/domain/entities/shared';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { AddressRepository } from 'src/repositories/shared';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { EditStoragePointInput } from './dto';
import { STORAGE_POINT_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';
import { StoragePointData } from 'src/domain/interfaces/warehouses';

type ValidationResult = {
  storagePoint: StoragePoint;
  address: Address;
  addressChanged: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditStoragePointService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
    private readonly _httpService: HttpService,
  ) {}

  async editStoragePoint(
    input: EditStoragePointInput,
    user: UserCon,
    accessToken?,
  ): Promise<StoragePointItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      validationResult,
      accessToken,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: EditStoragePointInput,
    result: ValidationResult,
    accessToken?,
  ): Promise<StoragePointItemOutput> {
    try {
      const { storagePoint, address, addressChanged, lang, user } = result;

      if (addressChanged) {
        storagePoint.address = address;
        storagePoint.addressId = address.id;
      }

      if (input.storageType) {
        storagePoint.storageType = input.storageType;
      }

      if (input.name) {
        storagePoint.name = input.name;
      }

      if (input.description) {
        if (!storagePoint.description) {
          storagePoint.description = input.description;
        } else {
          const inputLangs = Object.keys(input.description);
          inputLangs.forEach(
            (l) => (storagePoint.description[l] = input.description[l]),
          );
        }
      }

      if (input.isPrimary) {
        storagePoint.isPrimary = input.isPrimary;
        if (input.isPrimary === 1) {
          const storagePoints = await this._storagePointRepository.find({
            where: { isPrimary: 1 },
            relations: ['address'],
          });

          const storagePointToEdit = storagePoints.find(
            (wh) => wh.address.city.name === storagePoint.address.city.name,
          );
          if (storagePointToEdit && storagePointToEdit.id !== storagePoint.id) {
            storagePointToEdit.isPrimary = 0;

            await this._storagePointRepository.save(storagePointToEdit);
          }
        }
      }

      // if (
      //   input.locationKeywords &&
      //   !isNullOrWhiteSpace(input.locationKeywords)
      // ) {
      //   storagePoint.locationKeywords = input.locationKeywords;
      // }

      if (input.status) {
        storagePoint.status = input.status;
      }

      if (input.space) {
        storagePoint.space = input.space;
        storagePoint.surface = input.space.width * input.space.length;
        storagePoint.volume = input.space.height
          ? input.space.width * input.space.length * input.space.height
          : null;
      }

      storagePoint.allowSales = input.allowSales;
      storagePoint.allowVirtualZones = input.allowVirtualZones;
      storagePoint.updatedBy = user;

      await this._storagePointRepository.save(storagePoint);

      const storagePointDatas: StoragePointData = {
        storagePointRef: storagePoint.reference,
        storageType: storagePoint.storageType,
        name: storagePoint.name,
        status: storagePoint.status,
      };

      const path = `${process.env.AUTH_API_PATH}/${STORAGE_POINT_RESOURCE}/${storagePoint.reference}`;

      console.log('AUTH ENDPOINT ', path);

      await this._httpService.axiosRef
        .patch(path, storagePointDatas, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Accept-Encoding': 'gzip,deflate,compress',
          },
        })
        .then((response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. Ref=${
              storagePointDatas.storagePointRef +
              ' - Name=' +
              storagePointDatas.name
            }, Result=${response.statusText}`,
          );
        })
        .catch((error) => {
          throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
        });

      return new StoragePointItemOutput(storagePoint, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${EditStoragePointService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(
    input: EditStoragePointInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { storagePointId, addressId, ...datas } = input;

      const storagePoint = await this._storagePointRepository.findOne({
        where: { id: storagePointId },
        relations: ['address'],
      });
      if (!storagePoint) {
        throw new NotFoundException(
          `Storage point with id '${storagePointId}' not found`,
        );
      }

      let address: Address;

      if (addressId && !isNullOrWhiteSpace(addressId)) {
        address = await this._addressRepository.findOne({
          where: { id: addressId },
        });
        if (!address) {
          throw new NotFoundException(
            `Address with id '${addressId}' not found`,
          );
        }
      }

      if (input.isPrimary) {
        if (Number.isNaN(input.isPrimary) || input.isPrimary < 0) {
          throw new HttpException(
            `Invalid fields: isPrimary ${input.isPrimary}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      return {
        storagePoint,
        address,
        addressChanged: !!address,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditStoragePointService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
