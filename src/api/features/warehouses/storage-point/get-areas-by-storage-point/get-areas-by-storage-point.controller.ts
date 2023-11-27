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
import { GetAreasByStoragePointOptionsDto } from 'src/domain/dto/warehouses';
import {
  GetAreasByStoragePointInput,
  GetAreasByStoragePointOutput,
} from './dto';
import { GetAreasByStoragePointService } from './get-areas-by-storage-point.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetAreasByStoragePointController {
  constructor(
    private readonly _getAreasByStoragePointService: GetAreasByStoragePointService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':storagePointId/areas')
  @ApiResponse({
    status: 200,
    type: GetAreasByStoragePointOutput,
  })
  async getAreasByStoragePoint(
    @Param('storagePointId') storagePointId: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetAreasByStoragePointOptionsDto,
  ): Promise<GetAreasByStoragePointOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAreasByStoragePointInput = {
      storagePointId,
      pagination,
      options,
    };
    return await this._getAreasByStoragePointService.getAreasByStoragePoint(
      input,
    );
  }
}
