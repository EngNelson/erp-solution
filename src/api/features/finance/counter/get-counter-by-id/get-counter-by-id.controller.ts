import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetCounterByIdService } from './get-counter-by-id.service';
import { CounterItemOutput } from 'src/domain/dto/finance/counter';
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
import { GetCounterByIdInput } from './dto';

@ApiTags('counters')
@Controller('counters')
export class GetCounterByIdController {
  constructor(private readonly _getCounterByIdService: GetCounterByIdService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.DAF,
    AgentRoles.DG,
    AgentRoles.ACCOUNTING,
    AgentRoles.TREASURY,
  )
  @Ressource(ApiRessources.COUNTER)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get(':counterId')
  @ApiResponse({
    status: 200,
    type: CounterItemOutput,
  })
  async getCounterById(
    @Param('counterId') counterId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CounterItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCounterByIdInput = {
      counterId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getCounterByIdService.getCounterById(input, user);
  }
}
