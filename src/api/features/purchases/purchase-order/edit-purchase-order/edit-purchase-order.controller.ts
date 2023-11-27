import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  Req,
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
import { EditPurchaseOrderInput } from './dto';
import { EditPurchaseOrderService } from './edit-purchase-order.service';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class EditPurchaseOrderController {
  constructor(
    private readonly _editPurchaseOrderService: EditPurchaseOrderService,
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
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('edit/:purchaseOrderId')
  @ApiResponse({
    status: 200,
    type: PurchaseOrderItemOutput,
  })
  async editPurchaseOrder(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() body: EditPurchaseOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
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

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._editPurchaseOrderService.editPurchaseOrder(
      body,
      user,
      accessToken,
    );
  }
}
