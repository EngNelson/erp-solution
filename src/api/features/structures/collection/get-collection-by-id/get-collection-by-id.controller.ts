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
import { CollectionItemOutput } from 'src/domain/dto/structures';
import { GetCollectionByIdInput } from './dto';
import { GetCollectionByIdService } from './get-collection-by-id.service';

@ApiTags('collections')
@Controller('collections')
export class GetCollectionByIdController {
  constructor(
    private readonly _getCollectionByIdService: GetCollectionByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':collectionId')
  @ApiResponse({
    status: 200,
    type: CollectionItemOutput,
  })
  async getCollectionById(
    @Param('collectionId') collectionId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<CollectionItemOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetCollectionByIdInput = {
      collectionId,
      lang: params.lang
        ? params.lang
        : user.permissions
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getCollectionByIdService.getCollectionById(input, user);
  }
}
