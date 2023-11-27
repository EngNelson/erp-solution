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
import { GetDeletedAttributesInput, GetDeletedAttributesOutput } from './dto';
import { GetDeletedAttributesService } from './get-deleted-attributes.service';

@ApiTags('attributes')
@Controller('attributes')
export class GetDeletedAttributesController {
  constructor(
    private readonly _getDeletedAttributesService: GetDeletedAttributesService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(AgentRoles.SUPER_ADMIN, AgentRoles.ADMIN, AgentRoles.CONTENT_MANAGER)
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get('/deleted')
  @ApiResponse({
    status: 200,
    type: GetDeletedAttributesOutput,
  })
  async getDeletedAttributes(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetDeletedAttributesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetDeletedAttributesInput = { pagination };
    return await this._getDeletedAttributesService.getDeletedAttributes(
      input,
      user,
    );
  }
}
