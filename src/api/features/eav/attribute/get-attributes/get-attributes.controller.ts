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
import { GetAttributesInput, GetAttributesOutput } from './dto';
import { GetAttributesService } from './get-attributes.service';

@ApiTags('attributes')
@Controller('attributes')
export class GetAttributesController {
  constructor(private readonly _getAttributesService: GetAttributesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetAttributesOutput,
  })
  async getAttributes(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
  ): Promise<GetAttributesOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAttributesInput = { pagination };
    return await this._getAttributesService.getAttributes(input, user);
  }
}
