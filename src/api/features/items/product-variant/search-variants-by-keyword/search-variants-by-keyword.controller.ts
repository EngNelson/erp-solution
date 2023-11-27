import {
  PaginationDto,
  Public,
  SearchPaginationDto,
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
import {
  SearchVariantsByKeywordInput,
  SearchVariantsByKeywordOutput,
} from './dto';
import { SearchVariantsByKeywordService } from './search-variants-by-keyword.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class SearchVariantsByKeywordController {
  constructor(
    private readonly _searchVariantsByKeyworkService: SearchVariantsByKeywordService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('search/:keyword')
  @ApiResponse({
    status: 200,
    type: SearchVariantsByKeywordOutput,
  })
  async searchVariantsByKeyword(
    @Param('keyword') keyword: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<SearchVariantsByKeywordOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: SearchVariantsByKeywordInput = {
      keyword,
      pagination,
    };

    return await this._searchVariantsByKeyworkService.searchVariantsByKeyword(
      input,
      user,
    );
  }
}
