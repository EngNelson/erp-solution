import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetAddressesOptionsInput } from 'src/domain/dto/shared';
import { GetAddressesInput, GetAddressesOutput } from './dto';
import { GetAddressesService } from './get-addresses.service';

@ApiTags('addresses')
@Controller('addresses')
export class GetAddressesController {
  constructor(private readonly _getAddressesService: GetAddressesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetAddressesOutput,
  })
  async getAddresses(
    @UserConnected() user: UserCon,
    @Query() pagination?: PaginationDto,
    @Query() options?: GetAddressesOptionsInput,
  ): Promise<GetAddressesOutput> {
    const input: GetAddressesInput = { pagination, options };
    return await this._getAddressesService.getAddresses(input, user);
  }
}
