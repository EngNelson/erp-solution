import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupplierItemOutput } from 'src/domain/dto/purchases';
import { Supplier } from 'src/domain/entities/purchases';
import { Address } from 'src/domain/entities/shared';
import { SupplierRepository } from 'src/repositories/purchases';
import { AddressRepository } from 'src/repositories/shared';
import { AddSupplierInput } from './dto';

type ValidationResult = {
  address: Address;
  isAddress: boolean;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class AddSupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(Address)
    private readonly _addressRepository: AddressRepository,
  ) {}

  async addSupplier(
    input: AddSupplierInput,
    user: UserCon,
  ): Promise<SupplierItemOutput> {
    const result = await this._tryValidation(input, user);

    if (!result) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, result);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddSupplierInput,
    result: ValidationResult,
  ): Promise<SupplierItemOutput> {
    const supplier = new Supplier();

    try {
      const { address, isAddress, user, lang } = result;

      supplier.name = input.name;
      if (isAddress) {
        supplier.addressId = address.id;
        supplier.address = address;
      }
      supplier.createdBy = user;

      await this._supplierRepository.save(supplier);

      return new SupplierItemOutput(supplier);
    } catch (error) {
      console.log(error);

      if (supplier.id) {
        await this._supplierRepository.delete(supplier.id);
      }
      throw new ConflictException(
        `${AddSupplierService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddSupplierInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      let address: Address;

      if (input.addressId && !isNullOrWhiteSpace(input.addressId)) {
        address = await this._addressRepository.findOne({
          where: { id: input.addressId },
        });

        if (!address) {
          throw new NotFoundException(
            `Address your are trying to get is not found`,
          );
        }
      }

      return {
        address,
        isAddress: !!address,
        user,
        lang,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${AddSupplierService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
