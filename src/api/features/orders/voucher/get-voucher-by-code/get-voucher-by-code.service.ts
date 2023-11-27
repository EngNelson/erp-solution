import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { VoucherItemOutput } from 'src/domain/dto/orders';
import { Voucher } from 'src/domain/entities/orders';
import { VoucherRepository } from 'src/repositories/orders';
import { GetVoucherByCodeInput } from './dto/get-voucher-by-code-input.dto';
import { UserCon } from '@glosuite/shared';

@Injectable()
export class GetVoucherByCodeService {
  constructor(
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
  ) {}

  async getVoucher(
    input: GetVoucherByCodeInput,
    user: UserCon,
  ): Promise<VoucherItemOutput> {
    const resultgetvoucher = await this._tryExecution(input, user);

    if (!resultgetvoucher) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }
    return resultgetvoucher;
  }

  private async _tryExecution(
    input: GetVoucherByCodeInput,
    user: UserCon,
  ): Promise<VoucherItemOutput> {
    try {
      const voucher = await this._voucherRepository.findOne({
        where: { code: input.code },
      });

      if (!voucher) {
        throw new NotFoundException(
          `Voucher with code '${input.code}' not found`,
        );
      }

      return new VoucherItemOutput(voucher);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${GetVoucherByCodeService.name} - ${this._tryExecution.name} - `,
        error.message ? error.message : error,
      );
    }
  }
}
