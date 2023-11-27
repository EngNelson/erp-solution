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
import { GetOtherOutputsInput, GetOtherOutputsOutput } from './dto';
import { GetOtherOutputsService } from './get-other-outputs.service';
import { GetOtherOutputsOptionsDto } from 'src/domain/dto/flows';

@ApiTags('other-outputs')
@Controller('other-outputs')
export class GetOtherOutputsController {
  constructor(
    private readonly _getOtherOutputsService: GetOtherOutputsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetOtherOutputsOutput,
  })
  async getOtherOutputs(
    @Query() pagination: PaginationDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetOtherOutputsOptionsDto,
  ): Promise<GetOtherOutputsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetOtherOutputsInput = { pagination, options };
    return await this._getOtherOutputsService.getOtherOutputs(input, user);
  }
}
