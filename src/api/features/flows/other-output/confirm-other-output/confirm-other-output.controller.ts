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
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { ConfirmOtherOutputInput } from './dto';
import { ConfirmOtherOutputService } from './confirm-other-output.service';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class ConfirmOtherOutputController {
  constructor(
    private readonly _confirmOtherOutputService: ConfirmOtherOutputService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CONFIRM)
  @Patch('/confirm/:outputReference')
  @ApiResponse({
    status: 201,
    type: OtherOutputItemOutput,
  })
  async confirmOtherOutput(
    @Param('outputReference') outputReference: string,
    @Body() body: ConfirmOtherOutputInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.outputReference = outputReference;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._confirmOtherOutputService.confirmOtherOutput(body, user);
  }
}
