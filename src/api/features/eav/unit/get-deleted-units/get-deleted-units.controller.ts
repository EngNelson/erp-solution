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
import { GetDeletedUnitsInput, GetDeletedUnitsOutput } from './dto';
import { GetDeletedUnitsService } from './get-deleted-units.service';

@ApiTags('units')
@Controller('units')
export class GetDeletedUnitsController {
  constructor(
    private readonly _getDeletedUnitsService: GetDeletedUnitsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/deleted')
  @ApiResponse({
    status: 200,
    type: GetDeletedUnitsOutput,
  })
  async getDeletedUnits(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetDeletedUnitsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetDeletedUnitsInput = { pagination };
    return await this._getDeletedUnitsService.getDeletedUnits(input, user);
  }
}
