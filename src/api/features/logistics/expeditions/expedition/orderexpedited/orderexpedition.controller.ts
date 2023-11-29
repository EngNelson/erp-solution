import {
    Body,
    Controller,
    NotFoundException,
    Post,
    Query,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import { ApiTags } from '@nestjs/swagger';
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
  
import { OrderExpeditedService } from './orderexpedited.service';
import { OrderExpeditedInput } from './dto';
  
  @ApiTags('expeditions')
  @Controller('expeditions')
  export class OrderExpeditedController {
    constructor(private readonly _orderExpeditedService: OrderExpeditedService) {}
  
    @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
    @Roles(
      AgentRoles.SUPER_ADMIN,
      AgentRoles.ADMIN,
      AgentRoles.PUS_COORDINATOR,
      AgentRoles.PUS_MANAGER,
      AgentRoles.PUS_AGENT,
      AgentRoles.PUS_CASHIER,
      AgentRoles.SAV_AGENT,
      AgentRoles.SAV_MANAGER,
      AgentRoles.STOCK_AGENT,
      AgentRoles.PICK_PACK,
      AgentRoles.FLEET_SUPERVISOR,
      AgentRoles.WAREHOUSE_MANAGER,
      AgentRoles.LOGISTIC_MANAGER,
      AgentRoles.CUSTOMER_SERVICE,
      AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    )
    @Ressource(ApiRessources.ORDERS)
    @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
    @Post()
    async orderExpedited(
      @Body() body: OrderExpeditedInput,
      @Query() params: ISOLandDto,
      @UserConnected() user: UserCon,
      @Req() request: any,
    ): Promise<any> {
      if (!user) {
        throw new NotFoundException(`User not found`);
      }
  
      body.lang = params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;
  
      const accessToken = request.headers.authorization.replace('Bearer ', '');
      return await this._orderExpeditedService.orderExpedited(body, user, accessToken);
    }
  }
  