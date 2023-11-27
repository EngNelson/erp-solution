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
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { SearchSuppliersByNameInput, SearchSuppliersByNameOutput } from './dto';
import { SearchSuppliersByNameService } from './search-suppliers-by-name.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SearchSuppliersByNameController {
  constructor(
    private readonly _searchSuppliersByNameService: SearchSuppliersByNameService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('search/:keyword')
  @ApiResponse({
    status: 200,
    type: SearchSuppliersByNameOutput,
  })
  async searchSuppliersByName(
    @Param('keyword') keyword: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<SearchSuppliersByNameOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: SearchSuppliersByNameInput = {
      keyword,
      pagination,
    };

    return await this._searchSuppliersByNameService.searchSuppliersByName(
      input,
      user,
    );
  }
}
