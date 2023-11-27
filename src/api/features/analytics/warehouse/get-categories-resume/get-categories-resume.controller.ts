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
import { GetCategoriesResumeInput, GetCategoriesResumeOutput } from './dto';
import { GetCategoriesResumeService } from './get-categories-resume.service';

@ApiTags('analytics')
@Controller('warehouse')
export class GetCategoriesResumeController {
  constructor(
    private readonly _getCategoriesResumeService: GetCategoriesResumeService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('categories')
  @ApiResponse({
    status: 201,
    type: GetCategoriesResumeOutput,
  })
  async getCategoriesResume(
    @Query() params: GetCategoriesResumeInput,
    @UserConnected() user: UserCon,
  ): Promise<GetCategoriesResumeOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return await this._getCategoriesResumeService.getCategoriesResume(
      params,
      user,
    );
  }
}
