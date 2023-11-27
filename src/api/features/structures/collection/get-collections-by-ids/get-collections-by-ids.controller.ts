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
import { IdsDto } from 'src/domain/dto/shared';
import { GetCollectionsByIdsInput, GetCollectionsByIdsOutput } from './dto';
import { GetCollectionsByIdsService } from './get-collections-by-ids.service';

@ApiTags('collections')
@Controller('collections')
export class GetCollectionsByIdsController {
  constructor(
    private readonly _getCollectionsByIdsService: GetCollectionsByIdsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('/some')
  @ApiResponse({
    status: 200,
    type: GetCollectionsByIdsOutput,
  })
  async getCollectionsByIds(
    @Query() params: IdsDto,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetCollectionsByIdsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCollectionsByIdsInput = { ids: params.ids, pagination };
    return await this._getCollectionsByIdsService.getCollectionsByIds(
      input,
      user,
    );
  }
}
