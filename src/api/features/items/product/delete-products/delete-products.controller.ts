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
import { DeleteProductsService } from './delete-products.service';
import { DeleteProductsInput } from './dto/delete-products-input.dto';
import { DeleteProductsOutput } from './dto/delete-products-output.dto';

@ApiTags('products')
@Controller('products')
export class DeleteProductsController {
  constructor(private readonly _deleteProductsService: DeleteProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.PRODUCTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.DELETE)
  @Delete()
  @ApiResponse({
    status: 200,
    type: DeleteProductsOutput,
  })
  async deleteProducts(
    @Body() body: DeleteProductsInput,
    @UserConnected() user: UserCon,
  ): Promise<DeleteProductsOutput> {
    return await this._deleteProductsService.deleteProducts(body, user);
  }
}
