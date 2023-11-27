import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { MiniProductVariantOutput } from 'src/domain/dto/items';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { ProductVariantItemDetails } from 'src/domain/types/catalog/items';
import {
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { GetProductVariantsInput, GetProductVariantsOutput } from './dto';

type ValidationResult = {
  pageIndex?: number;
  pageSize?: number;
  lang?: ISOLang;
};

@Injectable()
export class GetProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getProductVariants(
    input: GetProductVariantsInput,
    user: UserCon,
  ): Promise<GetProductVariantsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetProductVariantsOutput = await this._tryExecution(
      validationResult,
    );

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
  ): Promise<GetProductVariantsOutput> {
    try {
      const { pageIndex, pageSize, lang } = result;

      const skip = pageSize * ((pageIndex || DEFAULT_PAGE_INDEX) - 1);
      const take = pageSize || DEFAULT_PAGE_SIZE;

      const variants = await this._productVariantRepository.find({
        take,
        skip,
      });

      const allVariantsOutput: Partial<ProductVariantItemDetails>[] = [];

      await Promise.all(
        variants.map(async (variant) => {
          const variantDetails =
            await this._sharedService.buildMiniPartialVariantOutput(variant);

          allVariantsOutput.push(variantDetails);
        }),
      );

      const allVariants = await this._productVariantRepository.findAndCount();

      return new GetProductVariantsOutput(
        allVariantsOutput.map(
          (variantDetails) =>
            new MiniProductVariantOutput(variantDetails, lang),
        ),
        allVariants[1],
        pageIndex,
        pageSize,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetProductVariantsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { pagination } = input;

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

      return { ...pagination };
    } catch (error) {
      throw new BadRequestException(
        `${GetProductVariantsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
