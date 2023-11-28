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

import { GetPackagesService } from './get-packages.service';
import { GetPackagesInput } from './dto/get-packages-input.dto';
import { GetPackagesOutput } from './dto/get-packages-output.dto';

@ApiTags('packages')
@Controller('packages')
export class GetPackagesController {
  constructor(private readonly _getPackagesService: GetPackagesService) {}

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
  @ApiResponse({
    status: 201,
    type: ,
  })
  async GetOrder(
    @Body() body: GetPackagesInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<GetPackagesOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._getPackagesService.getPackages(body, user, accessToken);
  }
}
