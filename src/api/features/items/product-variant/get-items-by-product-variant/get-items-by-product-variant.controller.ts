import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  PaginationDto,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import {
  GetItemsByProductVariantInput,
  GetItemsByProductVariantOutput,
} from './dto';
import { GetItemsByProductVariantService } from './get-items-by-product-variant.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class GetItemsByProductVariantController {
  constructor(
    private readonly _getItemsByProductVariantService: GetItemsByProductVariantService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.PRODUCT_ITEMS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':variantId/product-items')
  @ApiResponse({
    status: 200,
    type: GetItemsByProductVariantOutput,
  })
  async getProductItemsByVariant(
    @Param('variantId') variantId: string,
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetItemsByProductVariantOutput> {
    const input: GetItemsByProductVariantInput = { variantId, pagination };
    return await this._getItemsByProductVariantService.getProductItemsByVariant(
      input,
      user,
    );
  }
}
