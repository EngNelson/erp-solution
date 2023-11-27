import {
  Controller,
  Delete,
  NotFoundException,
  Param,
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
import { DeleteAttributeService } from './delete-attribute.service';
import { DeleteAttributeInput } from './dto';

@ApiTags('attributes')
@Controller('attributes')
export class DeleteAttributeController {
  constructor(
    private readonly _deleteAttributeService: DeleteAttributeService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete(':attributeId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  async deleteAttribute(
    @Param('attributeId') attributeId: string,
    @UserConnected() user: UserCon,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: DeleteAttributeInput = { attributeId };
    return await this._deleteAttributeService.deleteAttribute(input, user);
  }
}
