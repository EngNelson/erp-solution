import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import {
  GetProductVariantsByProductInput,
  GetProductVariantsByProductOutput,
} from './dto';
import { GetProductVariantsByProductService } from './get-product-variants-by-product.service';

@ApiTags('products')
@Controller('products')
export class GetProductVariantsByProductController {
  constructor(
    private readonly _getProductVariantsByProductService: GetProductVariantsByProductService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':productId/variants')
  @ApiResponse({
    status: 200,
    type: GetProductVariantsByProductOutput,
  })
  async getProductVariantsByProduct(
    @Param('productId') productId: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetProductVariantsByProductOutput> {
    const input: GetProductVariantsByProductInput = {
      productId,
      pagination,
    };
    return await this._getProductVariantsByProductService.getProductVariantsByProduct(
      input,
      user,
    );
  }
}
