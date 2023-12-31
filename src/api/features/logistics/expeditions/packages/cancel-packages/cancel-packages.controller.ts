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
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';

import { CancelPackageService, cancelPackagesService } from './cancel-packages.service';
import {AddPackagesInput} from './dto'; 
import { CancelPackagesInput } from './dto/cancel-input.dto';

@ApiTags('packages')
@Controller('packages')
export class CancelPackagesController {
  constructor(private readonly _cancelPackagesService: CancelPackageService) {}

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
    type: CancelPackagesInput,
  })
  async addOrder(
    @Body() body: AddPackagesInput,
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
    return await this._cancelPackagesService.cancelPackages(body, user, accessToken);
  }
}
