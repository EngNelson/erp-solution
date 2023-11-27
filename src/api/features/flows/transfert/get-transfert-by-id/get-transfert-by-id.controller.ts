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
import { TransfertItemDetailsOutput } from 'src/domain/dto/flows';
import { GetTransfertByIdInput } from './dto';
import { GetTransfertByIdService } from './get-transfert-by-id.service';

@ApiTags('transferts')
@Controller('transferts')
export class GetTransfertByIdController {
  constructor(
    private readonly _getTransfertByIdService: GetTransfertByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':transfertId')
  @ApiResponse({
    status: 200,
    type: TransfertItemDetailsOutput,
  })
  async getTransfertById(
    @Param('transfertId') transfertId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<TransfertItemDetailsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetTransfertByIdInput = {
      transfertId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getTransfertByIdService.getTransfertById(input, user);
  }
}
