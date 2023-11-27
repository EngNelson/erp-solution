import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  GetOptionsDto,
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { CategoryItemOutput } from 'src/domain/dto/structures';
import { GetCategoryByIdInput } from './dto';
import { GetCategoryByIdService } from './get-category-by-id.service';

@ApiTags('categories')
@Controller('categories')
export class GetCategoryByIdController {
  constructor(
    private readonly _getCategoryByIdService: GetCategoryByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':categoryId')
  @ApiResponse({
    status: 200,
    type: CategoryItemOutput,
  })
  async getCategoryById(
    @Param('categoryId') id: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetOptionsDto,
  ): Promise<CategoryItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetCategoryByIdInput = {
      id,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
      options,
    };
    return await this._getCategoryByIdService.getCategoryById(input, user);
  }
}
