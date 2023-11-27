import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { AddInventoryService } from './add-inventory.service';
import { AddInventoryInput } from './dto';

@ApiTags('inventories')
@Controller('inventories')
export class AddInventoryController {
  constructor(private readonly _addInventoryService: AddInventoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: InventoryItemOutput,
  })
  async addInventory(
    @Body() body: AddInventoryInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InventoryItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addInventoryService.addInventory(body, user);
  }
}
