import { Public, UserCon, UserConnected } from '@glosuite/shared';
import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetProfitResumeInput, GetProfitResumeOutput } from './dto';
import { GetProfitResumeService } from './get-profit-resume.service';

@ApiTags('analytics')
@Controller('warehouse')
export class GetProfitResumeController {
  constructor(
    private readonly _getProfitResumeService: GetProfitResumeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('profit')
  @ApiResponse({
    status: 201,
    type: GetProfitResumeOutput,
  })
  async getWarehouseResume(
    @Query() params: GetProfitResumeInput,
    @UserConnected() user: UserCon,
  ): Promise<GetProfitResumeOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._getProfitResumeService.getProfitResume(params, user);
  }
}
