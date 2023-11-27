import {
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
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { ValidateInternalNeedInput } from './dto';
import { ValidateInternalNeedService } from './validate-internal-need.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class ValidateInternalNeedController {
  constructor(
    private readonly _validateInternaleNeedService: ValidateInternalNeedService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.DG,
    AgentRoles.DAF,
    AgentRoles.SUPER_ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.VALIDATE)
  @Patch('/validate/:internalNeedId')
  @ApiResponse({
    status: 201,
    type: InternalNeedItemOutput,
  })
  async validateInternalNeed(
    @Param('internalNeedId') internalNeedId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: ValidateInternalNeedInput = {
      internalNeedId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._validateInternaleNeedService.validateInternalNeed(
      input,
      user,
    );
  }
}
