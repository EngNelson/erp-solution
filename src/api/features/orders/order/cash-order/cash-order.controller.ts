import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CashOrderService } from './cash-order.service';
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
import { CashOrderInput, CashOrderOutput } from './dto';

@ApiTags('orders')
@Controller('orders')
export class CashOrderController {
  constructor(private readonly _cashOrderService: CashOrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ACCOUNTING,
    AgentRoles.TREASURY,
    AgentRoles.PUS_CASHIER,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.EXPEDITION_AGENT,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('cash-order')
  @ApiResponse({
    status: 201,
    type: CashOrderOutput,
  })
  async cashOrder(
    @Body() body: CashOrderInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CashOrderOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._cashOrderService.cashOrder(body, user);
  }
}
