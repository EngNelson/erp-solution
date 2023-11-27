import {
  Body,
  Controller,
  Delete,
  NotFoundException,
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
import { DeleteCollectionsService } from './delete-collections.service';
import { DeleteCollectionsInput, DeleteCollectionsOutput } from './dto';

@ApiTags('collections')
@Controller('collections')
export class DeleteCollectionsController {
  constructor(
    private readonly _deleteCollectionsService: DeleteCollectionsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.COLLECCTIONS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 200,
    type: DeleteCollectionsOutput,
  })
  async deleteCollections(
    @Body() body: DeleteCollectionsInput,
    @UserConnected() user: UserCon,
  ): Promise<DeleteCollectionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._deleteCollectionsService.deleteCollections(body, user);
  }
}
