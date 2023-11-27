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
import { GetWarehouseResumeInput, GetWarehouseResumeOutput } from './dto';
import { GetWarehouseResumeService } from './get-warehouse-resume.service';

@ApiTags('analytics')
@Controller('warehouse')
export class GetWarehouseResumeController {
  constructor(
    private readonly _getWarehouseResumeService: GetWarehouseResumeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('resume')
  @ApiResponse({
    status: 201,
    type: GetWarehouseResumeOutput,
  })
  async getWarehouseResume(
    @Query() params: GetWarehouseResumeInput,
    @UserConnected() user: UserCon,
  ): Promise<GetWarehouseResumeOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._getWarehouseResumeService.getWarehouseResume(
      params,
      user,
    );
  }
}
