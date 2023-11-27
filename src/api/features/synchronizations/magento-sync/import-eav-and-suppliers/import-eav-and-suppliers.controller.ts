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
import { ImportEavAndSuppliersOutput } from 'src/domain/dto/magento';
import { ImportEavAndSuppliersService } from './import-eav-and-suppliers.service';

@ApiTags('synchronization')
@Controller('synchronization')
export class ImportEavAndSuppliersController {
  constructor(
    private readonly _importEavAndSuppliersService: ImportEavAndSuppliersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.SYNCHRONIZATION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/import-eav-and-suppliers')
  @ApiResponse({
    status: 200,
    type: ImportEavAndSuppliersOutput,
  })
  async importEavAndSuppliers(
    @UserConnected() user: UserCon,
  ): Promise<ImportEavAndSuppliersOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._importEavAndSuppliersService.importEavAndSuppliers();
  }
}
