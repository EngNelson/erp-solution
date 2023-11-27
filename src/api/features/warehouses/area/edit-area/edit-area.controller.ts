import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { AreaItemOutput } from 'src/domain/dto/warehouses';
import { EditAreaInput } from './dto';
import { EditAreaService } from './edit-area.service';

@ApiTags('areas')
@Controller('areas')
export class EditAreaController {
  constructor(private readonly _editAreaService: EditAreaService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.AREAS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':areaId')
  @ApiResponse({
    status: 201,
    type: AreaItemOutput,
  })
  async editArea(
    @Param('areaId') areaId: string,
    @Body() body: EditAreaInput,
    @UserConnected() user: UserCon,
  ): Promise<AreaItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.areaId = areaId;
    return await this._editAreaService.editArea(body, user);
  }
}
