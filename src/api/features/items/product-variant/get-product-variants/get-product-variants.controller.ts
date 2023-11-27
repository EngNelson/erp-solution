import {
  Controller,
  Get,
  NotFoundException,
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
import { GetProductVariantsInput, GetProductVariantsOutput } from './dto';
import { GetProductVariantsService } from './get-product-variants.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class GetProductVariantsController {
  constructor(
    private readonly _getProductVariantsService: GetProductVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetProductVariantsOutput,
  })
  async getProductVariants(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetProductVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetProductVariantsInput = { pagination };
    return await this._getProductVariantsService.getProductVariants(
      input,
      user,
    );
  }
}
