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
import { GetReceptionsOptionsDto } from 'src/domain/dto/flows';
import { GetReceptionsInput, GetReceptionsOutput } from './dto';
import { GetReceptionsService } from './get-receptions.service';

@ApiTags('receptions')
@Controller('receptions')
export class GetReceptionsController {
  constructor(private readonly _getReceptionsService: GetReceptionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.PICK_PACK,
    AgentRoles.RECEIVER,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.LOGISTIC_MANAGER,
    AgentRoles.CUSTOMER_SERVICE,
    AgentRoles.CUSTOMER_SERVICE_SUPERVISOR,
    AgentRoles.PROCUREMENT_SUPPLY,
  )
  @Ressource(ApiRessources.RECEPTION)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get()
  @ApiResponse({
    status: 200,
    type: GetReceptionsOutput,
  })
  async getReceptions(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetReceptionsOptionsDto,
  ): Promise<GetReceptionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetReceptionsInput = { pagination, options };
    return await this._getReceptionsService.getReceptions(input, user);
  }
}
