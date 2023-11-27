import {
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { SupplierItemOutput } from 'src/domain/dto/purchases';
import { GetSupplierByIdInput } from './dto';
import { GetSupplierByIdService } from './get-supplier-by-id.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class GetSupplierByIdController {
  constructor(
    private readonly _getSupplierByIdService: GetSupplierByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':supplierId')
  @ApiResponse({
    status: 200,
    type: SupplierItemOutput,
  })
  async getSupplierById(
    @Param('supplierId') supplierId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<SupplierItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetSupplierByIdInput = {
      supplierId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getSupplierByIdService.getSupplierById(input, user);
  }
}
