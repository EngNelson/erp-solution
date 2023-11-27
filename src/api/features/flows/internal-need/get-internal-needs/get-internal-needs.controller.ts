import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from 'src/api/guards';
import { GetInternalNeedsInput, GetInternalNeedsOutput } from './dto';
import { GetInternalNeedsService } from './get-internal-needs.service';

@ApiTags('internal-needs')
@Controller('internal-needs')
export class GetInternalNeedsController {
  constructor(
    private readonly _getInternalNeedsService: GetInternalNeedsService,
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
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.DAF,
    AgentRoles.DG,
    AgentRoles.GUEST_USER,
    AgentRoles.SAV_MANAGER,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.INTERNAL_NEED)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get()
  @ApiResponse({
    status: 201,
    type: GetInternalNeedsOutput,
  })
  async getInternalNeeds(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetInternalNeedsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetInternalNeedsInput = { pagination };
    return await this._getInternalNeedsService.getInternalNeeds(input, user);
  }
}
