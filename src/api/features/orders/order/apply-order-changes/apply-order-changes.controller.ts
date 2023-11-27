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
import { ApplyOrderChangesService } from './apply-order-changes.service';
import { ApplyOrderChangesInput } from './dto';

@ApiTags('orders')
@Controller('orders')
export class ApplyOrderChangesController {
  constructor(
    private readonly _applyOrderChangesService: ApplyOrderChangesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.DAF,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('apply/:orderId')
  @ApiResponse({
    status: 201,
    type: OrderItemOutput,
  })
  async applyOrderChanges(
    @Param('orderId') orderId: string,
    @Body() body: ApplyOrderChangesInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
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
    return await this._applyOrderChangesService.applyOrderChanges(body, user);
  }
}
