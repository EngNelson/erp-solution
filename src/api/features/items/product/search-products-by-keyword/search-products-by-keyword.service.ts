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
import { Product } from 'src/domain/entities/items';
import { ProductRepository } from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { Like } from 'typeorm';
import {
  SearchProductItemOutput,
  SearchProductsByKeywordInput,
  SearchProductsByKeywordOutput,
} from './dto';

@Injectable()
export class SearchProductsByKeywordService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async searchProductsByKeyword(
    input: SearchProductsByKeywordInput,
    user: UserCon,
  ): Promise<SearchProductsByKeywordOutput> {
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
    input: SearchProductsByKeywordInput,
    user: UserCon,
  ): Promise<SearchProductsByKeywordOutput> {
    try {
      const { keyword, pagination } = input;

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

      let outputs: Product[] = [];
      let allResults: Product[] = [];

      const firstQuery = await this._productRepository.find({
        where: [
          { title: Like(`%${keyword}%`) },
          { sku: Like(`%${keyword}%`) },
          { reference: Like(`%${keyword}%`) },
        ],
        relations: ['productVariants'],
        order: { createdAt: 'DESC' },
        take,
        skip,
      });

      if (firstQuery.length > 0) {
        outputs.push(...firstQuery);

        allResults = await this._productRepository.find({
          where: [
            { title: Like(`%${keyword}%`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
          ],
        });
      } else {
        const keywords = keyword
          .split(' ')
          .filter((keyword) => keyword.length > 2);

        const [firstEx, secondEx] =
          this._sharedService.buildSearchExpression(keywords);

        outputs = await this._productRepository.find({
          where: [
            { title: Like(`%${firstEx}%`) },
            { title: Like(`%${secondEx}%`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
          ],
          relations: ['productVariants'],
          order: { createdAt: 'DESC' },
          take,
          skip,
        });

        allResults = await this._productRepository.find({
          where: [
            { title: Like(`%${firstEx}%`) },
            { title: Like(`%${secondEx}%`) },
            { sku: Like(`%${keyword}%`) },
            { reference: Like(`%${keyword}%`) },
          ],
          relations: ['productVariants'],
          order: { createdAt: 'DESC' },
        });
      }

      return new SearchProductsByKeywordOutput(
        outputs.map((product) => new SearchProductItemOutput(product, lang)),
        allResults.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${SearchProductsByKeywordService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
