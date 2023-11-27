import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { ProductItemOutput } from 'src/domain/dto/items';
import { Product, ProductComposition } from 'src/domain/entities/items';
import {
  ProductCompositionRepository,
  ProductRepository,
} from 'src/repositories/items';
import { GetProductByIdInput } from './dto';

@Injectable()
export class GetProductByIdService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
  ) {}

  async getProductById(
    input: GetProductByIdInput,
    user: UserCon,
  ): Promise<ProductItemOutput> {
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
    input: GetProductByIdInput,
    user: UserCon,
  ): Promise<ProductItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const product = await this._productRepository.findOne(input.id, {
        relations: ['categories', 'attributeSet', 'children'],
      });
      if (!product) {
        throw new NotFoundException(`Product with id '${input.id}' not found`);
      }

      product.children = await this._productCompositionRepository.find({
        where: { parentId: product.id },
        relations: ['child'],
        order: { position: 'ASC' },
      });

      return new ProductItemOutput(product, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetProductByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
