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
import { GetAttributeSetsInput, GetAttributeSetsOutput } from './dto';
import { GetAttributeSetsService } from './get-attribute-sets.service';

@ApiTags('attribute-sets')
@Controller('attribute-sets')
export class GetAttributeSetsController {
  constructor(
    private readonly _getAttributeSetsService: GetAttributeSetsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetAttributeSetsOutput,
  })
  async getAttributeSets(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetAttributeSetsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetAttributeSetsInput = { pagination };
    return await this._getAttributeSetsService.getAttributeSets(input, user);
  }
}
