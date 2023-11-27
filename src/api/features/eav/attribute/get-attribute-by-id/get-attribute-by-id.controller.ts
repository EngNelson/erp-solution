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
import { AttributeItemOutput } from 'src/domain/dto/items/eav';
import { GetAttributeByIdInput } from './dto';
import { GetAttributeByIdService } from './get-attribute-by-id.service';

@ApiTags('attributes')
@Controller('attributes')
export class GetAttributeByIdController {
  constructor(
    private readonly _getAttributeByIdService: GetAttributeByIdService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':attributeId')
  @ApiResponse({
    status: 200,
    type: AttributeItemOutput,
  })
  async getAttributeById(
    @Param('attributeId') attributeId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<AttributeItemOutput> {
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const input: GetAttributeByIdInput = {
      attributeId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };

    return await this._getAttributeByIdService.getAttributeById(input, user);
  }
}
