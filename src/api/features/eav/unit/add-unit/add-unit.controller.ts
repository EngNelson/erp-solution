import {
  Body,
  Controller,
  NotFoundException,
  Post,
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
import { UnitItemOutput } from 'src/domain/dto/items/eav';
import { AddUnitService } from './add-unit.service';
import { AddUnitInput } from './dto';

@ApiTags('units')
@Controller('units')
export class AddUnitController {
  constructor(private readonly _addUnitService: AddUnitService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.CONTENT,
    AgentRoles.CONTENT_MANAGER,
  )
  @Ressource(ApiRessources.ATTRIBUTES)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CREATE)
  @Post()
  @ApiResponse({
    status: 201,
    type: UnitItemOutput,
  })
  async addUnit(
    @Body() body: AddUnitInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<UnitItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;
    return await this._addUnitService.addUnit(body, user);
  }
}
