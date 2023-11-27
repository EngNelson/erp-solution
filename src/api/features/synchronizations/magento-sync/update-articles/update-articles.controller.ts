import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateArticlesService } from './update-articles.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
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
import { ImportArticlesOutput } from 'src/domain/dto/magento';

@ApiTags('synchronization')
@Controller('synchronization')
export class UpdateArticlesController {
  constructor(private readonly _updateArticlesService: UpdateArticlesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.SYNCHRONIZATION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Get('/update-articles')
  @ApiResponse({
    status: 200,
    type: ImportArticlesOutput,
  })
  async updateArticles(
    @UserConnected() user: UserCon,
  ): Promise<ImportArticlesOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._updateArticlesService.updateArticles();
  }
}
