import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetProductsOptionsInput } from 'src/domain/dto/items';
import { GetCategoryProductsInput, GetCategoryProductsOutput } from './dto';
import { GetCategoryProductsService } from './get-category-products.service';

@ApiTags('categories')
@Controller('categories')
export class GetCategoryProductsController {
  constructor(
    private readonly _getProductsByCategoryService: GetCategoryProductsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':categoryId/products')
  @ApiResponse({
    status: 200,
    type: GetCategoryProductsOutput,
  })
  async getProductsByCategory(
    @Param('categoryId') categoryId: string,
    @UserConnected() user: UserCon,
    @Query() options?: GetProductsOptionsInput,
  ) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetCategoryProductsInput = {
      categoryId,
    };
    return await this._getProductsByCategoryService.getProductsByCategory(
      input,
      user,
      options,
    );
  }
}
