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
import { UnitItemOutput } from 'src/domain/dto/items/eav';
import { EditUnitInput } from './dto';
import { EditUnitService } from './edit-unit.service';

@ApiTags('units')
@Controller('units')
export class EditUnitController {
  constructor(private readonly _editUnitService: EditUnitService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.CONTENT,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/:unitId')
  @ApiResponse({
    status: 201,
    type: UnitItemOutput,
  })
  async editUnit(
    @Param('unitId') unitId: string,
    @Body() body: EditUnitInput,
    @UserConnected() user: UserCon,
  ): Promise<UnitItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    body.unitId = unitId;
    return await this._editUnitService.editUnit(body, user);
  }
}
