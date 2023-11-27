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
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { OrderItemOutput } from 'src/domain/dto/orders';
import { CancelOrderService } from './cancel-order.service';
import { CancelOrderInput } from './dto/cancel-order-input.dto';

@ApiTags('orders')
@Controller('orders')
export class CancelOrderController {
  constructor(private readonly _cancelOrderService: CancelOrderService) {}

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
    AgentRoles.STOCK_AGENT,
    AgentRoles.PICK_PACK,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.SUPPORT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.CUSTOMER_SERVICE,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch('cancel/:orderBarcode')
  @ApiResponse({
    status: 201,
    type: CancelOrderInput,
  })
  async validateOtherOutput(
    @Param('orderBarcode') orderBarcode: string,
    @Body() body: CancelOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.orderBarcode = orderBarcode;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._cancelOrderService.cancelOrder(body, user);
  }
}
