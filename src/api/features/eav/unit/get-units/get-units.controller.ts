import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  PaginationDto,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetUnitsInput, GetUnitsOutput } from './dto';
import { GetUnitsService } from './get-units.service';

@ApiTags('units')
@Controller('units')
export class GetUnitsController {
  constructor(private readonly _getUnitsService: GetUnitsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetUnitsOutput,
  })
  async getUnits(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetUnitsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetUnitsInput = { pagination };
    return await this._getUnitsService.getUnits(input, user);
  }
}
