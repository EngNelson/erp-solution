import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AddressUsage, UserCon } from '@glosuite/shared';
import { AddressItemOutput } from 'src/domain/dto/shared';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';
import { AddAddressInput } from './dto';

@Injectable()
export class AddAddressService {
  constructor(
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async addAddress(
    input: AddAddressInput,
    user: UserCon,
  ): Promise<AddressItemOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddAddressInput,
    user: UserCon,
  ): Promise<AddressItemOutput> {
    const address = new Address();

    try {
      if (input.usage === AddressUsage.ORDERS_USAGE && !input.fullName) {
        throw new BadRequestException(
          `${AddAddressService.name} - ${this._tryExecution.name}: Please provide the customer full name.`,
        );
      }

      if (input.usage === AddressUsage.ORDERS_USAGE && !input.phone) {
        throw new BadRequestException(
          `${AddAddressService.name} - ${this._tryExecution.name}: Please provide the customer phone number.`,
        );
      }

      if (input.usage === AddressUsage.ORDERS_USAGE && !input.email) {
        throw new BadRequestException(
          `${AddAddressService.name} - ${this._tryExecution.name}: Please provide the customer email.`,
        );
      }

      address.usage = input.usage;
      address.fullName = input.fullName ? input.fullName : null;
      address.phone = input.phone ? input.phone : null;
      address.email = input.email ? input.email : null;
      address.postalCode = input.postalCode ? input.postalCode : null;
      address.positionRef = input.positionRef ? input.positionRef : null;
      address.positions = input.positions ? input.positions : [];
      address.street = input.street;
      address.quarter = input.quarter;
      address.city = input.city;
      address.region = input.region;
      address.country = input.country;
      address.createdBy = user;

      await this._addressRepository.save(address);

      return new AddressItemOutput(address);
    } catch (error) {
      if (address.id) {
        await this._addressRepository.delete(address.id);
      }

      throw new ConflictException(
        `${AddAddressService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }
}
