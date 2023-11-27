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
import {
  RestoreProductVariantsInput,
  RestoreProductVariantsOutput,
} from './dto';
import { RestoreProductVariantsService } from './restore-product-variants.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class RestoreProductVariantsController {
  constructor(
    private readonly _restoreProductVariantsService: RestoreProductVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.PRODUCT_VARIANTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.RESTORE)
  @Patch('/restore')
  @ApiResponse({
    status: 201,
    type: RestoreProductVariantsOutput,
  })
  async restoreProductVariants(
    @Body() body: RestoreProductVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<RestoreProductVariantsOutput> {
    return await this._restoreProductVariantsService.restoreProductVariants(
      body,
      user,
    );
  }
}
