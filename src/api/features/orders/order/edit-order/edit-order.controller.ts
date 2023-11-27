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
import { EditOrderService } from './edit-order.service';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
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

import { EditOrderInput } from './dto';

@ApiTags('orders')
@Controller('orders')
export class EditOrderController {
  constructor(private readonly _editOrderService: EditOrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PUS_MANAGER,
    AgentRoles.PUS_AGENT,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.PUS_CASHIER,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.SAV_AGENT,
    AgentRoles.SAV_MANAGER,
    AgentRoles.PICK_PACK,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.PROCUREMENT_ASSISTANT,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch(':orderId')
  @ApiResponse({
    status: 201,
    type: OrderItemOutput,
  })
  async editOrder(
    @Param('orderId') orderId: string,
    @Body() body: EditOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.orderId = orderId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._editOrderService.editOrder(body, user, accessToken);
  }
}
