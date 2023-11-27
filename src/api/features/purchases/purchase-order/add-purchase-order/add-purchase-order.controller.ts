import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { AddPurchaseOrderService } from './add-purchase-order.service';
import { AddPurchaseOrderInput } from './dto';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class AddPurchaseOrderController {
  constructor(
    private readonly _addPurchaseOrderService: AddPurchaseOrderService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.PURCHASE_ORDER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: PurchaseOrderItemOutput,
  })
  async addPurchaseOrder(
    @Body() body: AddPurchaseOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<PurchaseOrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._addPurchaseOrderService.addPurchaseOrder(
      body,
      user,
      accessToken,
    );
  }
}
