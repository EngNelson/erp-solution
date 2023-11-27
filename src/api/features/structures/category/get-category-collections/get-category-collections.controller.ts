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
  ISOLandDto,
  ISOLang,
  Public,
  UserCon,
  UserConnected,
} from '@glosuite/shared';
import { JwtAuthGuard, PermissionsGuard } from 'src/api/guards';
import { GetCollectionsOptionsDto } from 'src/domain/dto/structures';
import {
  GetCategoryCollectionsInput,
  GetCategoryCollectionsOutput,
} from './dto';
import { GetCategoryCollectionsService } from './get-category-collections.service';

@ApiTags('categories')
@Controller('categories')
export class GetCategoryCollectionsController {
  constructor(
    private readonly _getCategoryCollectionsService: GetCategoryCollectionsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':categoryId/collections')
  @ApiResponse({
    status: 200,
    type: GetCategoryCollectionsOutput,
  })
  async getCollectionsByCategory(
    @Param('categoryId') categoryId: string,
    @Query() params: ISOLandDto,
    @Query() options: GetCollectionsOptionsDto,
    @UserConnected() user: UserCon,
  ): Promise<GetCategoryCollectionsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCategoryCollectionsInput = {
      categoryId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
      options,
    };
    return await this._getCategoryCollectionsService.getCollectionsByCategory(
      input,
      user,
    );
  }
}
