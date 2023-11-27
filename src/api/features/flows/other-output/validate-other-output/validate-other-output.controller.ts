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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { ValidateOtherOutputInput } from './dto';
import { ValidateOtherOutputService } from './validate-other-output.service';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class ValidateOtherOutputController {
  constructor(
    private readonly _validateOtherOutputService: ValidateOtherOutputService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch('/validate/:outputReference')
  @ApiResponse({
    status: 201,
    type: OtherOutputItemOutput,
  })
  async validateOtherOutput(
    @Param('outputReference') outputReference: string,
    @Body() body: ValidateOtherOutputInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
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

    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._validateOtherOutputService.validateOtherOutput(
      body,
      user,
      accessToken,
    );
  }
}
