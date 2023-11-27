import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { ProductItemItemOutput } from 'src/domain/dto/items';
import { ProductItem, ProductVariant } from 'src/domain/entities/items';
import {
  ProductItemRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  GetItemsByProductVariantInput,
  GetItemsByProductVariantOutput,
} from './dto';

type ValidationResult = {
  variant: ProductVariant;
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetItemsByProductVariantService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
  ) {}

  async getProductItemsByVariant(
    input: GetItemsByProductVariantInput,
    user: UserCon,
  ): Promise<GetItemsByProductVariantOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetItemsByProductVariantOutput =
      await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<GetItemsByProductVariantOutput> {
    try {
      const { variant, pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const items = await this._productItemRepository.find({
        where: { productVariantId: variant.id },
        relations: ['location', 'supplier', 'productVariant'],
        take,
        skip,
      });

      return new GetItemsByProductVariantOutput(
        items.map((item) => new ProductItemItemOutput(item, lang)),
        items.length,
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetItemsByProductVariantService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetItemsByProductVariantInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { variantId, pagination } = input;

      pagination.pageIndex = pagination.pageIndex
        ? parseInt(pagination.pageIndex.toString())
        : 1;
      pagination.pageSize = pagination.pageSize
        ? parseInt(pagination.pageSize.toString())
        : 25;

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

      const variant = await this._productVariantRepository.findOne(variantId);
      if (!variant) {
        throw new NotFoundException(`Variant with id '${variantId}' not found`);
      }

      return { variant, ...pagination };
    } catch (error) {
      throw new BadRequestException(
        `${GetItemsByProductVariantService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
