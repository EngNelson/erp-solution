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
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { CancelOtherOutputService } from './cancel-other-output.service';
import { CancelOtherOutputInput } from './dto';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class CancelOtherOutputController {
  constructor(
    private readonly _cancelOtherOutputService: CancelOtherOutputService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CANCEL)
  @Patch('/cancel/:outputReference')
  @ApiResponse({
    status: 201,
    type: OtherOutputItemOutput,
  })
  async cancelOtherOutput(
    @Param('outputReference') outputReference: string,
    @Body() body: CancelOtherOutputInput,
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

    return await this._cancelOtherOutputService.cancelOtherOutput(body, user);
  }
}
