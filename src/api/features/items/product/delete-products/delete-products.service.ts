import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, UserCon } from '@glosuite/shared';
import {
  Product,
  ProductComposition,
  ProductItem,
} from 'src/domain/entities/items';
import {
  ProductCompositionRepository,
  ProductItemRepository,
  ProductRepository,
} from 'src/repositories/items';
import { DeleteProductsInput } from './dto/delete-products-input.dto';
import { DeleteProductsOutput } from './dto/delete-products-output.dto';

type ValidationResult = {
  products: Product[];
  user: UserCon;
};

@Injectable()
export class DeleteProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
  ) {}

  async deleteProducts(
    input: DeleteProductsInput,
    user: UserCon,
  ): Promise<DeleteProductsOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return new DeleteProductsOutput(executionResult.length);
  }

  private async _tryExecution(result: ValidationResult): Promise<Product[]> {
    try {
      const { products, user } = result;

      const productsToDelete: Product[] = [];

      products.forEach((product) => {
        product.children?.forEach((child) => {
          child.deletedBy = user;
          this._productCompositionRepository.softDelete(child.id);

          this._productCompositionRepository.save(child);
        });

        product.deletedBy = user;
        productsToDelete.push(product);
        this._productRepository.softDelete(product.id);
        this._productRepository.save(product);
      });

      /**
       * Emit the deleted products on queue
       */

      return productsToDelete;
    } catch (error) {
      throw new ConflictException(
        `${DeleteProductsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteProductsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { ids } = input;

      const products = await this._productRepository.findByIds(ids, {
        relations: ['children', 'parents', 'productVariants'],
      });
      if (products.length !== ids.length) {
        throw new NotFoundException(
          `Some products among provided ids are not found`,
        );
      }

      /**
       * On verifi si parmis les produits a supprimer
       * on a un des produits engage dans un BUNDLE ou GROUPE actif
       */
      const someHaveParent = products.some(
        (product) =>
          product.parents.length > 0 &&
          product.parents.some((parent) => !parent.deletedAt),
      );
      if (someHaveParent) {
        throw new BadRequestException(
          `Cannot delete a product child of a BUNDLED or a GROUPED.`,
        );
      }

      /**
       * Verifier si on a un item engage dans un mouvement de stock
       */

      /**
       * Verifier si on a au moins un item
       */
      const productsHavingItems = products.filter((product) => {
        const variants = product.productVariants.filter(async (variant) => {
          const items = await this._productItemRepository.find({
            where: { productVariantId: variant.id },
          });

          items && items.length > 0;
        });

        variants && variants.length > 0;
      });

      if (productsHavingItems.length > 0) {
        throw new BadRequestException(
          `Cannot delete product with actives items`,
        );
      }

      /**
       * Verifier si on a des items en stock
       */

      const isUserNotHavePrivileges = products.some((product) => {
        product.createdBy.email !== user.email &&
          user.roles.some((role) => {
            role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN;
          });
      });
      if (isUserNotHavePrivileges) {
        throw new UnauthorizedException(
          `You can only delete products that you have created`,
        );
      }

      return {
        products,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteProductsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
