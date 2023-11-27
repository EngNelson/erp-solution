import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { AddressItemOutput } from 'src/domain/dto/shared';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';
import { GetAddressByIdInput } from './dto';

@Injectable()
export class GetAddressByIdService {
  constructor(
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async getAddressById(
    input: GetAddressByIdInput,
    user: UserCon,
  ): Promise<AddressItemOutput> {
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
    input: GetAddressByIdInput,
    user: UserCon,
  ): Promise<AddressItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const address = await this._addressRepository.findOne({
        where: { id: input.addressId },
      });
      if (!address) {
        throw new NotFoundException(
          `Address with id '${input.addressId}' not found`,
        );
      }

      return new AddressItemOutput(address);
    } catch (error) {
      throw new BadRequestException(
        `${GetAddressByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
