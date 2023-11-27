import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateOtherOutputService } from './create-other-output.service';
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
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { CreateOtherOutputInput } from './dto';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class CreateOtherOutputController {
  constructor(
    private readonly _createOtherOutputService: CreateOtherOutputService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(
    AgentRoles.SUPER_ADMIN,
    AgentRoles.ADMIN,
    AgentRoles.STOCK_AGENT,
    AgentRoles.WAREHOUSE_MANAGER,
  )
  @Ressource(ApiRessources.OTHER_OUTPUT)
  @RequirePrivileges(Abilities.MANAGE, Abilities.CONFIRM)
  @Post('/create')
  @ApiResponse({
    status: 201,
    type: OtherOutputItemOutput,
  })
  async createOtherOutput(
    @Body() body: CreateOtherOutputInput,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<OtherOutputItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    body.lang = params.lang
      ? params.lang
      : user.preferedLang
      ? user.preferedLang
      : ISOLang.FR;

    return await this._createOtherOutputService.createOtherOutput(body, user);
  }
}
