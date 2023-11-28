import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Param,
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
import { GetPackageByIdInput } from './dto';
import { GetPackageByIdService } from './get-package-by-id.service';



@ApiTags('packages')
@Controller('packages')
export class GetPackageByIdController {
  constructor(private readonly _getPackageByIdService: GetPackageByIdService) { }


  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Public()
  @Get(':id')
  @ApiResponse({
    status: 200,

    type: GetPackageByIdInput,
  })
  async getPackageById(
    @Param("id") PackageId: string,
    @Query() params: ISOLandDto,
    @UserConnected() user: UserCon,
    @Req() request: any,
  ): Promise<GetPackageByIdInput | any> {
    if (!user) {
      throw new NotFoundException(`User not found`);
    }
    const input: GetPackageByIdInput = {
      PackageId,
      lang: params.lang
        ? params.lang
        : user.preferedLang
          ? user.preferedLang
          : ISOLang.FR,
    };
    const accessToken = request.headers.authorization.replace('Bearer ', '');
    return await this._getPackageByIdService.getPackageById(input, user,accessToken);
  }

}