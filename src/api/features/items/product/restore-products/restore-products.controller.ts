import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
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
import { RestoreProductsInput, RestoreProductsOutput } from './dto';
import { RestoreProductsService } from './restore-products.service';

@ApiTags('products')
@Controller('products')
export class RestoreProductsController {
  constructor(
    private readonly _restoreProductsService: RestoreProductsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PUS_COORDINATOR,
  )
  @Ressource(ApiRessources.PRODUCTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESTORE)
  @Patch('/restore')
  @ApiResponse({
    status: 201,
    type: RestoreProductsOutput,
  })
  async restoreProducts(
    @Body() body: RestoreProductsInput,
    @UserConnected() user: UserCon,
  ): Promise<RestoreProductsOutput> {
    return await this._restoreProductsService.restoreProducts(body, user);
  }
}
