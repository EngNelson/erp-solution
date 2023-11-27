import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { ProductItemOutput } from 'src/domain/dto/items';
import { AddProductService } from './add-product.service';
import { AddProductInput } from './dto';

@ApiTags('products')
@Controller('products')
export class AddProductController {
  constructor(private readonly _addProductService: AddProductService) {}

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
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: ProductItemOutput,
  })
  async addProduct(
    @Body() body: AddProductInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addProductService.addProduct(body, user);
  }
}
