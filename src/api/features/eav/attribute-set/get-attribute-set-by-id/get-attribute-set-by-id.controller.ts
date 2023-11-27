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
import { AttributeSetItemOutput } from 'src/domain/dto/items/eav';
import { GetAttributeSetByIdInput } from './dto';
import { GetAttributeSetByIdService } from './get-attribute-set-by-id.service';

@ApiTags('attribute-sets')
@Controller('attribute-sets')
export class GetAttributeSetByIdController {
  constructor(
    private readonly _getAttributeSetByIdService: GetAttributeSetByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':attributeSetId')
  @ApiResponse({
    status: 200,
    type: AttributeSetItemOutput,
  })
  async getAttributeSetById(
    @Param('attributeSetId') attributeSetId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AttributeSetItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAttributeSetByIdInput = {
      attributeSetId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getAttributeSetByIdService.getAttributeSetById(
      input,
      user,
    );
  }
}
