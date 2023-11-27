import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
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
import { ImportArticlesOutput } from 'src/domain/dto/magento';
import { ImportArticlesService } from './import-articles.service';

@ApiTags('synchronization')
@Controller('synchronization')
export class ImportArticlesController {
  constructor(private readonly _importArticlesService: ImportArticlesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.SYNCHRONIZATION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Get('/import-articles')
  @ApiResponse({
    status: 200,
    type: ImportArticlesOutput,
  })
  async importArticles(
    @UserConnected() user: UserCon,
  ): Promise<ImportArticlesOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._importArticlesService.importArticles();
  }
}
