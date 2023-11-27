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
import { DeleteAttributeSetService } from './delete-attribute-set.service';
import { DeleteAttributeSetInput } from './dto';

@ApiTags('attribute-sets')
@Controller('attribute-sets')
export class DeleteAttributeSetController {
  constructor(
    private readonly _deleteAttributeSetService: DeleteAttributeSetService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.CONTENT,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete(':attributeSetId')
  @ApiResponse({
    status: 200,
    type: Boolean,
  })
  async deleteAttributeSet(
    @Param('attributeSetId') attributeSetId: string,
    @UserConnected() user: UserCon,
  ): Promise<boolean> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: DeleteAttributeSetInput = { attributeSetId };
    return await this._deleteAttributeSetService.deleteAttributeSet(
      input,
      user,
    );
  }
}
