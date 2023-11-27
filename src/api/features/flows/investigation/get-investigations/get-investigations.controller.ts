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
import { GetInvestigationsOptionsDto } from 'src/domain/dto/flows';
import { GetInvestigationsInput, GetInvestigationsOutput } from './dto';
import { GetInvestigationsService } from './get-investigations.service';

@ApiTags('investigations')
@Controller('investigations')
export class GetInvestigationsController {
  constructor(
    private readonly _getInvestigationsService: GetInvestigationsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.ACCOUNTING,
    AgentRoles.TREASURY,
    AgentRoles.DAF,
    AgentRoles.DG,
  )
  @Ressource(ApiRessources.INVENTORY)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get()
  @ApiResponse({
    status: 200,
    type: GetInvestigationsOutput,
  })
  async getInvestigations(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetInvestigationsOptionsDto,
  ): Promise<GetInvestigationsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetInvestigationsInput = { pagination, options };
    return await this._getInvestigationsService.getInvestigations(input, user);
  }
}
