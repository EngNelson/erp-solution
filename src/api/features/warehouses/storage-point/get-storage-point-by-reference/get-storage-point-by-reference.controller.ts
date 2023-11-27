import {
  ISOLandDto,
  ISOLang,
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
import { MiniStoragePointOutput } from 'src/domain/dto/warehouses';
import { GetStoragePointByReferenceInput } from './dto';
import { GetStoragePointByReferenceService } from './get-storage-point-by-reference.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetStoragePointByReferenceController {
  constructor(
    private readonly _getStoragePointByReferenceService: GetStoragePointByReferenceService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('get/:reference')
  @ApiResponse({
    status: 200,
    type: MiniStoragePointOutput,
  })
  async getStoragePointByReference(
    @Param('reference') reference: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<MiniStoragePointOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetStoragePointByReferenceInput = {
      reference,
      lang: user.preferedLang
        ? user.preferedLang
        : params.lang
        ? params.lang
        : ISOLang.FR,
    };

    return await this._getStoragePointByReferenceService.getStoragePointByReference(
      input,
      user,
    );
  }
}
