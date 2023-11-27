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
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { ValidateReceptionInput } from './dto';
import { ValidateReceptionService } from './validate-reception.service';

@ApiTags('receptions')
@Controller('receptions')
export class ValidateReceptionController {
  constructor(
    private readonly _validateReceptionService: ValidateReceptionService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.RECEIVER,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch(':receptionId/validate')
  @ApiResponse({
    status: 200,
    type: ReceptionItemOutput,
  })
  async validateReception(
    @Param('receptionId') receptionId: string,
    @Body() body: ValidateReceptionInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<ReceptionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.receptionId = receptionId;
    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._validateReceptionService.validateReception(body, user);
  }
}
