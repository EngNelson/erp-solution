import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetCountersService } from './get-counters.service';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  PaginationDto,
  RequirePrivileges,
  Ressource,
  Roles,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { GetCountersOptionsDto } from 'src/domain/dto/finance/counter';
import { GetCountersInput, GetCountersOutput } from './dto';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';

@ApiTags('counters')
@Controller('counters')
export class GetCountersController {
  constructor(private readonly _getCountersService: GetCountersService) {}

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
  @Get()
  @ApiResponse({
    status: 200,
    type: GetCountersOutput,
  })
  async getCounters(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetCountersOptionsDto,
  ): Promise<GetCountersOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetCountersInput = { pagination, options };
    return await this._getCountersService.getCounters(input, user);
  }
}
