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
import {
  SearchTransfertsByReferenceInput,
  SearchTransfertsByReferenceOutput,
} from './dto';
import { SearchTransfertsByReferenceService } from './search-transferts-by-reference.service';

@ApiTags('transferts')
@Controller('transferts')
export class SearchTransfertsByReferenceController {
  constructor(
    private readonly _searchTransfertsByReference: SearchTransfertsByReferenceService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('/search/:motcle')
  @ApiResponse({
    status: 200,
    type: SearchTransfertsByReferenceOutput,
  })
  async searchTransfertsByReference(
    @Param('motcle') motcle: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<SearchTransfertsByReferenceOutput> {
    const input: SearchTransfertsByReferenceInput = {
      motcle,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._searchTransfertsByReference.searchTransfertsByReference(
      input,
      user,
    );
  }
}
