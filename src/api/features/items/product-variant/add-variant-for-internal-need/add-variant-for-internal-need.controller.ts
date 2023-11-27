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
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { AddVariantForInternalNeedService } from './add-variant-for-internal-need.service';
import { AddVariantForInternalNeedInput } from './dto';

@ApiTags('product-variants')
@Controller('product-variants')
export class AddVariantForInternalNeedController {
  constructor(
    private readonly _addVariantForInternalNeedService: AddVariantForInternalNeedService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.PICK_PACK,
    AgentRoles.STOCK_AGENT,
    AgentRoles.TREASURY,
    AgentRoles.ACCOUNTING,
    AgentRoles.DAF,
    AgentRoles.DG,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
  )
  @Ressource(ApiRessources.PRODUCT_VARIANTS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post('/material-requisition')
  @ApiResponse({
    status: 201,
    type: ProductVariantItemOutput,
  })
  async addVariantForInternalNeed(
    @Body() body: AddVariantForInternalNeedInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addVariantForInternalNeedService.addVariantForInternalNeed(
      body,
      user,
    );
  }
}
