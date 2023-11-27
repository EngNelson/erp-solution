import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EditAddressService } from './edit-address.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { AddressItemOutput } from 'src/domain/dto/shared';
import { EditAddressInput } from './dto';

@ApiTags('addresses')
@Controller('addresses')
export class EditAddressController {
  constructor(private readonly _editAddressService: EditAddressService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.ADDRESSES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':addressId')
  @ApiResponse({
    status: 200,
    type: AddressItemOutput,
  })
  async editAddress(
    @Param('addressId') addressId: string,
    @Body() body: EditAddressInput,
    @UserConnected() user: UserCon,
  ): Promise<AddressItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.addressId = addressId;
    return await this._editAddressService.editAddress(body, user);
  }
}
