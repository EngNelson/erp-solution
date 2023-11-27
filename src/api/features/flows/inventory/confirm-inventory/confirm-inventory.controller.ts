import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
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
import { ConfirmInventoryService } from './confirm-inventory.service';
import { ConfirmInventoryInput } from './dto';

@ApiTags('inventories')
@Controller('inventories')
export class ConfirmInventoryController {
  constructor(
    private readonly _confirmInventoryService: ConfirmInventoryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CONFIRM)
  @Patch('/confirm/:inventoryId')
  @ApiResponse({
    status: 201,
    type: InventoryItemOutput,
  })
  async confirmInventory(
    @Param('inventoryId') inventoryId: string,
    @Body() body: ConfirmInventoryInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InventoryItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.inventoryId = inventoryId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._confirmInventoryService.confirmInventory(body, user);
  }
}
