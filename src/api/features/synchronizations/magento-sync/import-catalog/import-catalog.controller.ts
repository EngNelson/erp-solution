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
import { ImportCatalogOutput } from 'src/domain/dto/magento';
import { ImportCatalogService } from './import-catalog.service';

@ApiTags('synchronization')
@Controller('synchronization')
export class ImportCatalogController {
  constructor(private readonly _importCatalogService: ImportCatalogService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.SYNCHRONIZATION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/import-catalog')
  @ApiResponse({
    status: 200,
    type: ImportCatalogOutput,
  })
  async importCatalog(
    @UserConnected() user: UserCon,
  ): Promise<ImportCatalogOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._importCatalogService.importCatalog();
  }
}
