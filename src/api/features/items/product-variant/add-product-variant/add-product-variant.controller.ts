import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { AddProductVariantService } from './add-product-variant.service';
import { AddProductVariantInput } from './dto';

@ApiTags('product-variants')
@Controller('product-variants')
export class AddProductVariantController {
  constructor(
    private readonly _addProductVariantService: AddProductVariantService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.PRODUCT_VARIANTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: ProductVariantItemOutput,
  })
  async addProductVariant(
    @Body() body: AddProductVariantInput,
    @UserConnected() user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    return await this._addProductVariantService.addProductVariant(body, user);
  }
}
