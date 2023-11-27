import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EditOtherOutputService } from './edit-other-output.service';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import {
  Roles,
  AgentRoles,
  Ressource,
  ApiRessources,
  RequirePrivileges,
  Abilities,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, RolesGuard, PermissionsGuard } from 'src/api/guards';
import { EditOtherOutputInput } from './dto';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class EditOtherOutputController {
  constructor(
    private readonly _editOtherOutputService: EditOtherOutputService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.UPDATE)
  @Patch('/edit/:reference')
  @ApiResponse({
    status: 201,
    type: OtherOutputItemOutput,
  })
  async editOtherOutput(
    @Param('reference') reference: string,
    @Body() body: EditOtherOutputInput,
    @UserConnected() user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.reference = reference;

    return await this._editOtherOutputService.editOtherOutput(body, user);
  }
}
