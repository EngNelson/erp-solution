import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetStockMovementsOptionsDto } from 'src/domain/dto/items';
import {
  GetProductItemStockMovementsInput,
  GetProductItemStockMovementsOutput,
} from './dto';
import { GetProductItemStockMovementsService } from './get-product-item-stock-movements.service';

@ApiTags('product-items')
@Controller('product-items')
export class GetProductItemStockMovementsController {
  constructor(
    private readonly _getProductItemStockMovementsService: GetProductItemStockMovementsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':productItemId/stock-movements')
  @ApiResponse({
    status: 200,
    type: GetProductItemStockMovementsOutput,
  })
  async getProductItemStockMovements(
    @Param('productItemId') productItemId: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() oprions?: GetStockMovementsOptionsDto,
  ): Promise<GetProductItemStockMovementsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetProductItemStockMovementsInput = {
      productItemId,
      pagination,
      oprions,
    };
    return await this._getProductItemStockMovementsService.getProductItemStockMovements(
      input,
      user,
    );
  }
}
