import {
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
import { RestoreAttributeInput, RestoreAttributeOutput } from './dto';
import { RestoreAttributeService } from './restore-attribute.service';

@ApiTags('attributes')
@Controller('attributes')
export class RestoreAttributeController {
  constructor(
    private readonly _restoreAttributeService: RestoreAttributeService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESTORE)
  @Patch(':attributeId/restore')
  @ApiResponse({
    status: 200,
    type: RestoreAttributeOutput,
  })
  async restoreAttribute(
    @Param('attributeId') attributeId: string,
    @UserConnected() user: UserCon,
  ): Promise<RestoreAttributeOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: RestoreAttributeInput = { attributeId };
    return await this._restoreAttributeService.restoreAttribute(input, user);
  }
}
