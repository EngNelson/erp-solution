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
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { AddInternalNeedService } from './add-internal-need.service';
import { AddInternalNeedInput } from './dto';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class AddInternalNeedController {
  constructor(
    private readonly _addInternalNeedService: AddInternalNeedService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CATMAN,
    AgentRoles.ACCOUNTING,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.PROCUREMENT_ASSISTANT,
    AgentRoles.PUS_COORDINATOR,
    AgentRoles.EXPEDITION_SUPERVISOR,
    AgentRoles.SAV_MANAGER,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async addInternalNeed(
    @Body() body: AddInternalNeedInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._addInternalNeedService.addInternalNeed(
      body,
      user,
      accessToken,
    );
  }
}
