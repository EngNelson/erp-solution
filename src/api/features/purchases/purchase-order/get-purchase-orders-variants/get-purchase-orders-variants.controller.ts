import {
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import {
  GetPurchaseOrdersVariantsInput,
  GetPurchaseOrdersVariantsOutput,
} from './dto';
import { GetPurchaseOrdersVariantsService } from './get-purchase-orders-variants.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class GetPurchaseOrdersVariantsController {
  constructor(
    private readonly _getPurchaseOrdersVariantsService: GetPurchaseOrdersVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PURCHAGE_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.PURCHASE_ORDER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('report/variants')
  @ApiResponse({
    status: 200,
    type: GetPurchaseOrdersVariantsOutput,
  })
  async getPurchaseOrdersVariants(
    @Query() body: GetPurchaseOrdersVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<GetPurchaseOrdersVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!body.lang) {
      body.lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
    }

    return await this._getPurchaseOrdersVariantsService.getPurchaseOrderVariants(
      body,
      user,
    );
  }
}
