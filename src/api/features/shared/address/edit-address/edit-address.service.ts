import { AddressUsage, AgentRoles, Roles, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Address } from 'src/domain/entities/shared';
import { AddressRepository } from 'src/repositories/shared';
import { EditAddressInput } from './dto';
import { AddressItemOutput } from 'src/domain/dto/shared';

type ValidationResult = {
  address: Address;
  user: UserCon;
};

@Injectable()
export class EditAddressService {
  constructor(
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async editAddress(
    input: EditAddressInput,
    user: UserCon,
  ): Promise<AddressItemOutput> {
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
    input: EditAddressInput,
    result: ValidationResult,
  ): Promise<AddressItemOutput> {
    try {
      const { address, user } = result;

      if (input.fullName) {
        address.fullName = input.fullName;
      }

      if (input.phone) {
        address.phone = input.phone;
      }

      if (input.email) {
        address.email = input.email;
      }

      if (input.street) {
        address.street = input.street;
      }

      if (input.quarter) {
        address.quarter = input.quarter;
      }

      if (input.city) {
        address.city = input.city;
      }

      if (input.region) {
        address.region = input.region;
      }

      if (input.country) {
        address.country = input.country;
      }

      if (
        input.fullName ||
        input.phone ||
        input.email ||
        input.street ||
        input.quarter ||
        input.city ||
        input.region ||
        input.country
      ) {
        address.updatedBy = user;
      }

      await this._addressRepository.save(address);

      return new AddressItemOutput(address);
    } catch (error) {
      throw new InternalServerErrorException(
        `${EditAddressService.name} - ${this._tryExecution.name} - ` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditAddressInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const address = await this._addressRepository.findOne({
        where: { id: input.addressId },
      });

      if (!address) {
        throw new NotFoundException(`Address ${input.addressId} not found`);
      }

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN || role === AgentRoles.ADMIN,
        )
      ) {
        if (
          address.usage === AddressUsage.WAREHOUSES_USAGE &&
          !user.roles.some((role) => role === AgentRoles.WAREHOUSE_MANAGER)
        ) {
          throw new UnauthorizedException(
            `You are not authorized to edit a warehouse address`,
          );
        }
      }

      return {
        address,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditAddressService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
