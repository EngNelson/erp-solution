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
  GetLocationProductVariantsInput,
  GetLocationProductVariantsOutput,
} from './dto';
import { GetLocationProductVariantsService } from './get-location-product-variants.service';

@ApiTags('locations')
@Controller('locations')
export class GetLocationProductVariantsController {
  constructor(
    private readonly _getLocationProductVariantsService: GetLocationProductVariantsService,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':locationId/variants')
  @ApiResponse({
    status: 200,
    type: GetLocationProductVariantsOutput,
  })
  async getLocationProductVariants(
    @Param('locationId') locationId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
  ): Promise<GetLocationProductVariantsOutput> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    const input: GetLocationProductVariantsInput = {
      locationId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR,
    };
    return await this._getLocationProductVariantsService.getLocationProductVariants(
      input,
      user,
    );
  }
}
