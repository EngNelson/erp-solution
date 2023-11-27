import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { GetProductVariantByIdInput } from './dto';
import { GetProductVariantByIdService } from './get-product-variant-by-id.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class GetProductVariantByIdController {
  constructor(
    private readonly _getProductVariantByIdService: GetProductVariantByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':variantId')
  @ApiResponse({
    status: 200,
    type: ProductVariantItemOutput,
  })
  async getProductVariantById(
    @Param('variantId') id: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    const input: GetProductVariantByIdInput = {
      id,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getProductVariantByIdService.getProductVariantById(
      input,
      user,
    );
  }
}
