import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetCategoriesOptionsDto } from 'src/domain/dto/structures';
import { GetCategoriesInput, GetCategoriesOutput } from './dto';
import { GetCategoriesService } from './get-categories.service';

@ApiTags('categories')
@Controller('categories')
export class GetCategoriesController {
  constructor(private readonly _getCategoriesService: GetCategoriesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get()
  @ApiResponse({
    status: 200,
    type: GetCategoriesOutput,
  })
  async getCategories(
    @UserConnected() user: UserCon,
    @Query() params?: ISOLandDto,
    @Query() options?: GetCategoriesOptionsDto,
  ) {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetCategoriesInput = {
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
      options,
    };
    return await this._getCategoriesService.getCategories(input, user);
  }
}
