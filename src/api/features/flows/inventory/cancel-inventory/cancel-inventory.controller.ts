import {
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
import { CancelInventoryService } from './cancel-inventory.service';
import { CancelInventoryInput } from './dto';

@ApiTags('inventories')
@Controller('inventories')
export class CancelInventoryController {
  constructor(
    private readonly _cancelInventoryService: CancelInventoryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch('/cancel/:inventoryId')
  @ApiResponse({
    status: 201,
    type: InventoryItemOutput,
  })
  async cancelInventory(
    @Param('inventoryId') inventoryId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InventoryItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: CancelInventoryInput = {
      inventoryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._cancelInventoryService.cancelInventory(input, user);
  }
}
