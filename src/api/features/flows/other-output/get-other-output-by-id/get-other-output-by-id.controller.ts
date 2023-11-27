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
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { GetOtherOutputByIdInput } from './dto';
import { GetOtherOutputByIdService } from './get-other-output-by-id.service';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class GetOtherOutputByIdController {
  constructor(
    private readonly _getOtherOutputByIdService: GetOtherOutputByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':otherOutputId')
  @ApiResponse({
    status: 200,
    type: OtherOutputItemOutput,
  })
  async getOtherOutputById(
    @Param('otherOutputId') otherOutputId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetOtherOutputByIdInput = {
      otherOutputId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getOtherOutputByIdService.getOtherOutputById(
      input,
      user,
    );
  }
}
