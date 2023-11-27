import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupplierItemOutput } from 'src/domain/dto/purchases';
import { Supplier } from 'src/domain/entities/purchases';
import { SupplierRepository } from 'src/repositories/purchases';
import { GetSupplierByIdInput } from './dto';

@Injectable()
export class GetSupplierByIdService {
  constructor(
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
  ) {}

  async getSupplierById(
    input: GetSupplierByIdInput,
    user: UserCon,
  ): Promise<SupplierItemOutput> {
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
    input: GetSupplierByIdInput,
    user: UserCon,
  ): Promise<SupplierItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const supplier = await this._supplierRepository.findOne({
        where: { id: input.supplierId },
        relations: ['address'],
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier ${input.supplierId} not found`);
      }

      return new SupplierItemOutput(supplier);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetSupplierByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
