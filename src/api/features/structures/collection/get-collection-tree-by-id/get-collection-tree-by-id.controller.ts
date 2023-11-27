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
import {
  CollectionItemOutput,
  GetCollectionsOptionsDto,
} from 'src/domain/dto/structures';
import { GetCollectionTreeByIdInput } from './dto';
import { GetCollectionTreeByIdService } from './get-collection-tree-by-id.service';

@ApiTags('collections')
@Controller('collections')
export class GetCollectionTreeByIdController {
  constructor(
    private readonly _getCollectionTreeByIdService: GetCollectionTreeByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get('/get-tree/:collectionId')
  @ApiResponse({
    status: 200,
    type: CollectionItemOutput,
  })
  async getCollectionTreeById(
    @Param('collectionId') id: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Query() options?: GetCollectionsOptionsDto,
  ): Promise<CollectionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCollectionTreeByIdInput = {
      id,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
      options,
    };
    return await this._getCollectionTreeByIdService.getCollectionTreeById(
      input,
      user,
    );
  }
}
