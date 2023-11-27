import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import {
  GetLocationsByStoragePointInput,
  GetLocationsByStoragePointOutput,
} from './dto';
import { GetLocationsByStoragePointService } from './get-locations-by-storage-point.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetLocationsByStoragePointController {
  constructor(
    private readonly _getLocationsByStoragePointService: GetLocationsByStoragePointService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':storagePointId/locations')
  @ApiResponse({
    status: 200,
    type: GetLocationsByStoragePointOutput,
  })
  async getAreasByStoragePoint(
    @Param('storagePointId') storagePointId: string,
    @UserConnected() user: UserCon,
  ): Promise<GetLocationsByStoragePointOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetLocationsByStoragePointInput = {
      storagePointId,
    };
    return await this._getLocationsByStoragePointService.getLocationsByStoragePoint(
      input,
      user,
    );
  }
}
