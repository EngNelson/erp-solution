import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssignOrdersToService } from './assign-orders-to.service';
import { AssignOrdersToInput, AssignOrdersToOutput } from './dto';
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

@ApiTags('orders')
@Controller('orders')
export class AssignOrdersToController {
  constructor(private readonly _assignOrdersToService: AssignOrdersToService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.FLEET_SUPERVISOR,
    AgentRoles.LOGISTIC_MANAGER,
  )
  @Ressource(ApiRessources.ORDERS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('assign-to')
  @ApiResponse({
    status: 201,
    type: AssignOrdersToOutput,
  })
  async assignOrdersTo(
    @Body() body: AssignOrdersToInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<AssignOrdersToOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._assignOrdersToService.assignOrdersTo(
      body,
      user,
      accessToken,
    );
  }
}
