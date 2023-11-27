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
import { PurchaseOrderItemOutput } from 'src/domain/dto/purchases';
import { ValidatePurchaseOrderInput } from './dto';
import { ValidatePurchaseOrderService } from './validate-purchase-order.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class ValidatePurchaseOrderController {
  constructor(
    private readonly _validatePurchaseOrderService: ValidatePurchaseOrderService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PROCUREMENT_SUPPLY,
    AgentRoles.PURCHAGE_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.PURCHASE_ORDER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch(':purchaseOrderId/validate')
  @ApiResponse({
    status: 200,
    type: PurchaseOrderItemOutput,
  })
  async validatePurchaseOrder(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() body: ValidatePurchaseOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.purchaseOrderId = purchaseOrderId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._validatePurchaseOrderService.validatePurchaseOrder(
      body,
      user,
    );
  }
}
