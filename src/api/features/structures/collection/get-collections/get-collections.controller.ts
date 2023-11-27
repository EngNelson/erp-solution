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
import { GetCollectionsOptionsDto } from 'src/domain/dto/structures';
import { GetCollectionsInput, GetCollectionsOutput } from './dto';
import { GetCollectionsService } from './get-collections.service';

@ApiTags('collections')
@Controller('collections')
export class GetCollectionsController {
  constructor(private readonly _getCollectionsService: GetCollectionsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetCollectionsOutput,
  })
  async getCollections(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetCollectionsOptionsDto,
  ): Promise<GetCollectionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCollectionsInput = { pagination, options };
    return await this._getCollectionsService.getCollections(input, user);
  }
}
