import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
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
import { ProductItemOutput } from 'src/domain/dto/items';
import { EditProductInput } from './dto';
import { EditProductService } from './edit-product.service';

@ApiTags('products')
@Controller('products')
export class EditProductController {
  constructor(private readonly _editProductService: EditProductService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.RECEIVER,
  )
  @Ressource(ApiRessources.PRODUCTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':productId')
  @ApiResponse({
    status: 200,
    type: ProductItemOutput,
  })
  async editProduct(
    @Param('productId') id: string,
    @Body() body: EditProductInput,
    @UserConnected() user: UserCon,
  ) {
    body.productId = id;
    return await this._editProductService.editProduct(body, user);
  }
}
