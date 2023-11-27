import {
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
import { CancelPurchaseOrderService } from './cancel-purchase-order.service';
import { CancelPurchaseOrderInput } from './dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class CancelPurchaseOrderController {
  constructor(
    private readonly _cancelPurchaseOrderService: CancelPurchaseOrderService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.PURCHASE_ORDER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch(':purchaseOrderId/cancel')
  @ApiResponse({
    status: 200,
    type: PurchaseOrderItemOutput,
  })
  async cancelPurchaseOrder(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<PurchaseOrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: CancelPurchaseOrderInput = {
      purchaseOrderId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._cancelPurchaseOrderService.cancelPurchaseOrder(
      input,
      user,
    );
  }
}
