import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariantRepository } from 'src/repositories/items';
import { CrawlArticlesService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { SyncVariantBySKUInput } from './dto';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ProductVariantItemOutput } from 'src/domain/dto/items';
import { ProductVariant } from 'src/domain/entities/items';

@Injectable()
export class SyncVariantBySKUService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _crawlArticleService: CrawlArticlesService,
    private readonly _sharedService: SharedService,
  ) {}

  async syncVariantBySKU(
    input: SyncVariantBySKUInput,
    user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: SyncVariantBySKUInput,
    user: UserCon,
  ): Promise<ProductVariantItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const variantExist = await this._productVariantRepository.findOne({
        where: { magentoSKU: input.magentoSku },
      });

      if (variantExist) {
        throw new BadRequestException(
          `This article (${input.magentoSku}) already exists in the database`,
        );
      }

      const productVariant =
        await this._crawlArticleService.importSingleProduct(input.magentoSku);

      if (!productVariant) {
        throw new InternalServerErrorException(
          `An error occured while importing ${input.magentoSku}. It seems that an article with that SKU doesn't exist on magento`,
        );
      }

      const variantDetails =
        await this._sharedService.buildVariantDetailsOutput(productVariant);

      return new ProductVariantItemOutput(variantDetails, lang);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${SyncVariantBySKUService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
