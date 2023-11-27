import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetOrdersVariantsService } from './get-orders-variants.service';
import { GetOrdersVariantsInput, GetOrdersVariantsOutput } from './dto';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  ISOLang,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';

@ApiTags('orders')
@Controller('orders')
export class GetOrdersVariantsController {
  constructor(
    private readonly _getOrdersVariantsService: GetOrdersVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.DAF,
    AgentRoles.DG,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('report/orders')
  @ApiResponse({
    status: 200,
    type: GetOrdersVariantsOutput,
  })
  async getOrdersVariants(
    @Query() body: GetOrdersVariantsInput,
    @UserConnected() user: UserCon,
  ): Promise<GetOrdersVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!body.lang) {
      body.lang = user.preferedLang ? user.preferedLang : ISOLang.FR;
    }

    return await this._getOrdersVariantsService.getOrdersVariants(body, user);
  }
}
