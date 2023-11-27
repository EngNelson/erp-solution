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
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLandDto,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { InventoryItemOutput } from 'src/domain/dto/flows';
import { GetInventoryByIdInput } from './dto';
import { GetInventoryByIdService } from './get-inventory-by-id.service';

@ApiTags('inventories')
@Controller('inventories')
export class GetInventoryByIdController {
  constructor(
    private readonly _getInventoryByIdService: GetInventoryByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.GUEST_USER,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':inventoryId')
  @ApiResponse({
    status: 200,
    type: InventoryItemOutput,
  })
  async getInventoryById(
    @Param('inventoryId') inventoryId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InventoryItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetInventoryByIdInput = {
      inventoryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getInventoryByIdService.getInventoryById(input, user);
  }
}
