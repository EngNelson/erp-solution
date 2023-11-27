import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetVoucherByCodeService } from './get-voucher-by-code.service';
import { VoucherItemOutput } from 'src/domain/dto/orders';
import { GetVoucherByCodeInput } from './dto/get-voucher-by-code-input.dto';

@ApiTags('vouchers')
@Controller('vouchers')
export class GetVoucherByCodeController {
  constructor(
    private readonly _getVoucherByCodeService: GetVoucherByCodeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @ApiResponse({
    status: 200,
    type: VoucherItemOutput,
  })
  @Get(':code')
  async getVoucherByCode(
    @Param('code') code: string,
    @UserConnected() user: UserCon,
  ): Promise<VoucherItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetVoucherByCodeInput = {
      code,
    };
    return await this._getVoucherByCodeService.getVoucher(input, user);
  }
}
