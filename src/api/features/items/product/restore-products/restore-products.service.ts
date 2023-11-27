import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
import { Product, ProductComposition } from 'src/domain/entities/items';
import {
  ProductCompositionRepository,
  ProductRepository,
} from 'src/repositories/items';
import {
  RestoreProductsInput,
  RestoreProductsOutput,
  RestoreProductsOutputItem,
} from './dto';

@Injectable()
export class RestoreProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
  ) {}

  async restoreProducts(
    input: RestoreProductsInput,
    user: UserCon,
  ): Promise<RestoreProductsOutput> {
    const result = await this._tryExecution(input, user);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: RestoreProductsInput,
    user: UserCon,
  ): Promise<RestoreProductsOutput> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      await this._productRepository.restore(input.ids);

      const products = await this._productRepository.findByIds(input.ids);

      const isUserConHavePrivileges = products.some(
        (product) =>
          product.deletedBy != user &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (!isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only restore products that you have deleted before.`,
        );
      }

      products.forEach(async (product) => {
        product.deletedBy = null;

        await this._productRepository.save(product);

        const compositions = await this._productCompositionRepository.find({
          where: { parentId: product.id },
          withDeleted: true,
        });

        compositions?.forEach((composition) => {
          composition.deletedBy = null;
          this._productCompositionRepository.restore(composition.id);
        });

        await this._productCompositionRepository.save(compositions);
      });

      return new RestoreProductsOutput(
        products.map((product) => new RestoreProductsOutputItem(product, lang)),
        products.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${RestoreProductsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.message,
      );
    }
  }
}
