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
import { ValidateInventoryInput } from './dto';
import { ValidateInventoryService } from './validate-inventory.service';

@ApiTags('inventories')
@Controller('inventories')
export class ValidateInventoryController {
  constructor(
    private readonly _validateInventoryService: ValidateInventoryService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CONFIRM)
  @Patch('/validate/:inventoryId')
  @ApiResponse({
    status: 201,
    type: InventoryItemOutput,
  })
  async validateInventory(
    @Param('inventoryId') inventoryId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InventoryItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: ValidateInventoryInput = {
      inventoryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._validateInventoryService.validateInventory(input, user);
  }
}
