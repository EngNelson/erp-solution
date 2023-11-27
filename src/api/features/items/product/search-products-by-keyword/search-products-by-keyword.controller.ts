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
import {
  SearchProductsByKeywordInput,
  SearchProductsByKeywordOutput,
} from './dto';
import { SearchProductsByKeywordService } from './search-products-by-keyword.service';

@ApiTags('products')
@Controller('products')
export class SearchProductsByKeywordController {
  constructor(
    private readonly _searchProductsByKeywordService: SearchProductsByKeywordService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('search/:keyword')
  @ApiResponse({
    status: 200,
    type: SearchProductsByKeywordOutput,
  })
  async searchProductsByKeyword(
    @Param('keyword') keyword: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<SearchProductsByKeywordOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: SearchProductsByKeywordInput = {
      keyword,
      pagination,
    };

    return await this._searchProductsByKeywordService.searchProductsByKeyword(
      input,
      user,
    );
  }
}
