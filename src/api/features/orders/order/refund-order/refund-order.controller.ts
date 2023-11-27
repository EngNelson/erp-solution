import {
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { RefundOrderService } from './refund-order.service';
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
import { OrderItemOutput } from 'src/domain/dto/orders';
import { RefundOrderInput } from './dto';

@ApiTags('orders')
@Controller('orders')
export class RefundOrderController {
  constructor(private readonly _refundOrderService: RefundOrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ACCOUNTING,
    AgentRoles.TREASURY,
    AgentRoles.DAF,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.REFUND)
  @Patch('refund/:orderId')
  @ApiResponse({
    status: 201,
    type: OrderItemOutput,
  })
  async refundOrder(
    @Param('orderId') orderId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: RefundOrderInput = {
      orderId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._refundOrderService.refundOrder(input, user);
  }
}
