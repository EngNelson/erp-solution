import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ISOLandDto, ISOLang, Public } from '@glosuite/shared';
import { UserConnected } from '@glosuite/shared';
import { UserCon } from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { StoragePointTreeOutput } from 'src/domain/dto/warehouses';
import { GetStoragePointTreeByIdInput } from './dto';
import { GetStoragePointTreeByIdService } from './get-storage-point-tree-by-id.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetStoragePointTreeByIdController {
  constructor(
    private readonly _getStoragePointTreeByIdService: GetStoragePointTreeByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':storagePointId/tree')
  @ApiResponse({
    status: 200,
    type: StoragePointTreeOutput,
  })
  async getStoragePointTreeById(
    @Param('storagePointId') storagePointId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<StoragePointTreeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetStoragePointTreeByIdInput = {
      storagePointId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getStoragePointTreeByIdService.getStoragePointTreeById(
      input,
    );
  }
}
