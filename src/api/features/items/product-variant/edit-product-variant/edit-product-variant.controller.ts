import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLandDto,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { EditProductVariantInput } from './dto';
import { EditProductVariantService } from './edit-product-variant.service';

@ApiTags('product-variants')
@Controller('product-variants')
export class EditProductVariantController {
  constructor(
    private readonly _editProductVariantService: EditProductVariantService,
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
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':variantId')
  @ApiResponse({
    status: 200,
    type: ProductVariantItemOutput,
  })
  async editProductVariant(
    @Param('variantId') id: string,
    @Body() body: EditProductVariantInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.variantId = id;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._editProductVariantService.editProductVariant(body, user);
  }
}
