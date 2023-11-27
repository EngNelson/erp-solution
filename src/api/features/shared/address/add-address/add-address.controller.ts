import {
  Body,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, UserCon, UserConnected } from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { AddressItemOutput } from 'src/domain/dto/shared';
import { AddAddressService } from './add-address.service';
import { AddAddressInput } from './dto';

@ApiTags('addresses')
@Controller('addresses')
export class AddAddressController {
  constructor(private readonly _addAddressService: AddAddressService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Post()
  @ApiResponse({
    status: 201,
    type: AddressItemOutput,
  })
  async addAddress(
    @Body() body: AddAddressInput,
    @UserConnected() user: UserCon,
  ): Promise<AddressItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._addAddressService.addAddress(body, user);
  }
}
