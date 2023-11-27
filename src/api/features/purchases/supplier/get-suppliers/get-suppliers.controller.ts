import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetSuppliersInput, GetSuppliersOutput } from './dto';
import { GetSuppliersService } from './get-suppliers.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class GetSuppliersController {
  constructor(private readonly _getSuppliersService: GetSuppliersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetSuppliersOutput,
  })
  async getSuppliers(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetSuppliersOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetSuppliersInput = { pagination };
    return await this._getSuppliersService.getSuppliers(input, user);
  }
}
