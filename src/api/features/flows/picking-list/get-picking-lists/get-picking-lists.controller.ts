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
import { GetPickingListsOptionsDto } from 'src/domain/dto/flows';
import { GetPickingListsInput, GetPickingListsOutput } from './dto';
import { GetPickingListsService } from './get-picking-lists.service';

@ApiTags('picking-lists')
@Controller('picking-lists')
export class GetPickingListsController {
  constructor(
    private readonly _getPickingListsService: GetPickingListsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.WAREHOUSE_MANAGER,
    AgentRoles.PICK_PACK,
    AgentRoles.STOCK_AGENT,
  )
  @Ressource(ApiRessources.PRODUCT_ITEMS)
  @RequirePrivileges(Abilities.MANAGE, Abilities.READ)
  @Get()
  @ApiResponse({
    status: 201,
    type: GetPickingListsOutput,
  })
  async getPickingLists(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetPickingListsOptionsDto,
  ): Promise<GetPickingListsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetPickingListsInput = { pagination, options };
    return await this._getPickingListsService.getPickingLists(input, user);
  }
}
