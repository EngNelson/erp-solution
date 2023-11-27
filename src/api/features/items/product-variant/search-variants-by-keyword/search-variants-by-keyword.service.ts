import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariant } from 'src/domain/entities/items';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import { ProductVariantRepository } from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { Like } from 'typeorm';
import {
  SearchVariantItemOutput,
  SearchVariantsByKeywordInput,
  SearchVariantsByKeywordOutput,
} from './dto';

@Injectable()
export class SearchVariantsByKeywordService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async searchVariantsByKeyword(
    input: SearchVariantsByKeywordInput,
    user: UserCon,
  ): Promise<SearchVariantsByKeywordOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: SearchVariantsByKeywordInput,
    user: UserCon,
  ): Promise<SearchVariantsByKeywordOutput> {
    try {
      const { keyword, inStock, pagination } = input;

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : DEFAULT_PAGE_INDEX;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : DEFAULT_PAGE_SIZE;

      pagination.lang = pagination.lang
        ? pagination.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      if (Number.isNaN(pagination.pageIndex) || pagination.pageIndex <= 0) {
        throw new HttpException(
          `Invalid fields: pageIndex ${pagination.pageIndex}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (Number.isNaN(pagination.pageSize) || pagination?.pageSize < 0) {
        throw new HttpException(
          `Invalid fields: pageSize ${pagination.pageSize}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!ISOLang[pagination.lang.toUpperCase()]) {
        throw new HttpException(
          `Invalid language input: ${pagination.lang} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { pageIndex, pageSize, lang } = pagination;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      // let params = '';
      // if (typeof inStock !== 'undefined') {
      // }

      let outputs: ProductVariant[] = [];
      let allResult: ProductVariant[] = [];

      const firstQuery = await this._productVariantRepository.find({
        where: [
          { title: Like(`%${keyword}%`) },
          { sku: Like(`%${keyword}%`) },
          { reference: Like(`%${keyword}%`) },
          { magentoSKU: Like(`%${keyword}%`) },
        ],
        take,
        skip,
        order: { createdAt: 'DESC' },
      });

      if (firstQuery.length > 0) {
        outputs.push(...firstQuery);

        allResult = await this._productVariantRepository.find({
          where: [
            { title: Like(`%${keyword}%`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
            { magentoSKU: Like(`%${keyword}%`) },
          ],
        });
      } else {
        const keywords = keyword
          .split(' ')
          .filter((keyword) => keyword.length > 2);

        const [firstEx, secondEx] =
          this._sharedService.buildSearchExpression(keywords);

        outputs = await this._productVariantRepository.find({
          where: [
            { title: Like(`${firstEx}`) },
            { title: Like(`${secondEx}`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
            { magentoSKU: Like(`%${keyword}%`) },
          ],
          take,
          skip,
          order: { createdAt: 'DESC' },
        });

        allResult = await this._productVariantRepository.find({
          where: [
            { title: Like(`${firstEx}`) },
            { title: Like(`${secondEx}`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
            { magentoSKU: Like(`%${keyword}%`) },
          ],
        });
      }

      const searchVariants: ProductVariantItemDetails[] = [];

      if (outputs && outputs.length > 0) {
        await Promise.all(
          outputs.map(async (variant) => {
            const variantDetails =
              await this._sharedService.buildVariantDetailsOutput(variant);

            searchVariants.push(variantDetails);
          }),
        );
      }

      return new SearchVariantsByKeywordOutput(
        searchVariants.map(
          (variant) => new SearchVariantItemOutput(variant, lang),
        ),
        allResult.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${SearchVariantsByKeywordService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
