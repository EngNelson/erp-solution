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
import { GetAllProductsInput, GetAllProductsOutput } from './dto';
import { GetAllProductsService } from './get-all-products.service';

@ApiTags('products')
@Controller('products')
export class GetAllProductsController {
  constructor(private readonly _getAllProductsService: GetAllProductsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetAllProductsOutput,
  })
  async getAllProducts(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetAllProductsOutput> {
    // if (!user) {
    //   throw new NotFoundException(`User not found`);
    // }

    const input: GetAllProductsInput = { pagination };
    return await this._getAllProductsService.getAllProducts(input, user);
  }
}
