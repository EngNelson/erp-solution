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
import { ProductItemOutput } from 'src/domain/dto/items';
import { GetProductByIdInput } from './dto';
import { GetProductByIdService } from './get-product-by-id.service';

@ApiTags('products')
@Controller('products')
export class GetProductByIdController {
  constructor(private readonly _getProductByIdService: GetProductByIdService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':productId')
  @ApiResponse({
    status: 200,
    type: ProductItemOutput,
  })
  async getProductById(
    @Param('productId') id: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductItemOutput> {
    const input: GetProductByIdInput = {
      id,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getProductByIdService.getProductById(input, user);
  }
}
