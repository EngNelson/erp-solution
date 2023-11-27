import { Body, Controller, Delete, UseGuards } from '@nestjs/common';
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
import { DeleteProductVariantsService } from './delete-product-variants.service';
import { DeleteProductVariantsInput, DeleteProductVariantsOutput } from './dto';

@ApiTags('product-variants')
@Controller('product-variants')
export class DeleteProductVariantsController {
  constructor(
    private readonly _deleteProductVariantsService: DeleteProductVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.PRODUCT_VARIANTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 200,
    type: DeleteProductVariantsOutput,
  })
  async deleteProductVariants(
    @Body() body: DeleteProductVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<DeleteProductVariantsOutput> {
    return await this._deleteProductVariantsService.deleteProductVariants(
      body,
      user,
    );
  }
}
