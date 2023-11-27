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
import { ValidateOrderInput } from './dto';
import { ValidateOrderService } from './validate-order.service';

@ApiTags('orders')
@Controller('orders')
export class ValidateOrderController {
  constructor(private readonly _validateOrderService: ValidateOrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PICK_PACK,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch('validate-order/:orderBarcode')
  @ApiResponse({
    status: 201,
    type: OrderItemOutput,
  })
  async validateOrder(
    @Param('orderBarcode') orderBarcode: string,
    @Query() params: ISOLandDto,
    @Body() body: ValidateOrderInput,
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

    return await this._validateOrderService.validateOrder(body, user);
  }
}
