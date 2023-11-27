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
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { StoragePointItemOutput } from 'src/domain/dto/warehouses';
import { GetStoragePointByIdInput } from './dto';
import { GetStoragePointByIdService } from './get-storage-point-by-id.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetStoragePointByIdController {
  constructor(
    private readonly _getStoragePointByIdService: GetStoragePointByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':storagePointId')
  @ApiResponse({
    status: 200,
    type: StoragePointItemOutput,
  })
  async getStoragePointById(
    @Param('storagePointId') storagePointId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<StoragePointItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetStoragePointByIdInput = {
      id: storagePointId,
      lang: params.lang ? params.lang : ISOLang.FR,
    };
    return await this._getStoragePointByIdService.getStoragePointById(
      input,
      user,
    );
  }
}
