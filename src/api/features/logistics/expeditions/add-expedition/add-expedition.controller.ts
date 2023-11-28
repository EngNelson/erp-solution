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
//   import { AddDeliveryInput } from './dto';
//   import { AddDeliveryService } from './add-delivery.service';
import { AddExpeditionInput } from './dto';
import {AddExpeditionService} from './add-expedition.service'; 
  
  
  
  @ApiTags('expedition')
  @Controller('expedition')
  export class AddExpeditionController {
    constructor(private readonly _addExpeditionService: AddExpeditionService) {}
  
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
    @Ressource(ApiRessources.EXPEDITION)
    @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
    @Post()
    @ApiResponse({
      status: 201,
      type: AddExpeditionInput,
    })
  async addDelivery(
    @Body() body: AddExpeditionInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<AddExpeditionInput>{
    if(!user){
    throw new NotFoundException(`User not Found`);
  }
  
  body.lang = params.lang
  ? params.lang
  : user.preferedLang
  ? user.preferedLang
  : ISOLang.FR;
  
  const accessToken = request.headers.authorization.replace('Bearer', '');
  return await this._addExpeditionService.addExpedition(body, user, accessToken);
  }
  
  }
  
  
  