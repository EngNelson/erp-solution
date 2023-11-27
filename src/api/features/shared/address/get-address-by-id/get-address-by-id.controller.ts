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
import { AddressItemOutput } from 'src/domain/dto/shared';
import { GetAddressByIdInput } from './dto';
import { GetAddressByIdService } from './get-address-by-id.service';

@ApiTags('addresses')
@Controller('addresses')
export class GetAddressByIdController {
  constructor(private readonly _getAddressByIdService: GetAddressByIdService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':addressId')
  @ApiResponse({
    status: 200,
    type: AddressItemOutput,
  })
  async getAddressById(
    @Param('addressId') addressId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AddressItemOutput> {
    const input: GetAddressByIdInput = {
      addressId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getAddressByIdService.getAddressById(input, user);
  }
}
