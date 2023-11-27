import {
  Controller,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { SendOrderToPurchaseService } from './send-order-to-purchase.service';
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
import { SendOrderToPurchaseInput } from './dto';

@ApiTags('orders')
@Controller('orders')
export class SendOrderToPurchaseController {
  constructor(
    private readonly _sendOrderToPurchaseService: SendOrderToPurchaseService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.WAREHOUSE_MANAGER)
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('send-to-purchase/:orderReference')
  @ApiResponse({
    status: 200,
    type: OrderItemOutput,
  })
  async sendOrderToPurchase(
    @Param('orderReference') orderReference: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OrderItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: SendOrderToPurchaseInput = {
      orderReference,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._sendOrderToPurchaseService.sendOrderToPurchase(
      input,
      user,
    );
  }
}
