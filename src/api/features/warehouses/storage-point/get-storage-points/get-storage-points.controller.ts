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
import { GetStoragePointsOptionsDto } from 'src/domain/dto/warehouses';
import { GetStoragePointsInput, GetStoragePointsOutput } from './dto';
import { GetStoragePointsService } from './get-storage-points.service';

@ApiTags('storage-points')
@Controller('storage-points')
export class GetStoragePointsController {
  constructor(
    private readonly _getStoragePointsService: GetStoragePointsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetStoragePointsOutput,
  })
  async getStoragePoints(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetStoragePointsOptionsDto,
  ): Promise<GetStoragePointsOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const input: GetStoragePointsInput = { pagination, options };
    return await this._getStoragePointsService.getStoragePoints(input, user);
  }
}
