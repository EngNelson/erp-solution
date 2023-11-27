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
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import {
  ProductItemRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { DeleteProductVariantsInput, DeleteProductVariantsOutput } from './dto';

type ValidationResult = {
  variants: ProductVariant[];
  user: UserCon;
};

@Injectable()
export class DeleteProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _variantAttributeValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
  ) {}

  async deleteProductVariants(
    input: DeleteProductVariantsInput,
    user: UserCon,
  ): Promise<DeleteProductVariantsOutput> {
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

    return new DeleteProductVariantsOutput(executionResult.length);
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<ProductVariant[]> {
    try {
      const { variants, user } = result;

      const variantsToDelete: ProductVariant[] = [];

      variants.forEach((variant) => {
        variant.attributeValues?.forEach((attrValue) => {
          attrValue.deletedBy = user;
          this._variantAttributeValuesRepository.softDelete(attrValue.id);

          this._variantAttributeValuesRepository.save(attrValue);
        });

        variant.deletedBy = user;
        variantsToDelete.push(variant);
        this._productVariantRepository.softDelete(variant.id);
        this._productVariantRepository.save(variant);
      });

      return variantsToDelete;
    } catch (error) {
      throw new ConflictException(
        `${DeleteProductVariantsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteProductVariantsInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { ids } = input;

      const variants = await this._productVariantRepository.findByIds(ids, {
        relations: ['attributeValues', 'productItems'],
      });

      if (variants.length !== ids.length) {
        throw new NotFoundException(
          `Some product variants provided are not found`,
        );
      }

      /**
       * Verifier si on a des variants ayant des items
       */
      const variantHavingActiveItems = variants.filter(
        (variant) => variant.productItems.length > 0,
      );

      if (variantHavingActiveItems.length > 0) {
        throw new UnauthorizedException(
          `You cannot delete variants with actives items`,
        );
      }

      const isUserNotHavePrivileges = variants.some((variant) => {
        variant.createdBy.email !== user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN &&
              role !== AgentRoles.ADMIN &&
              role !== AgentRoles.CONTENT_MANAGER,
          );
      });

      if (isUserNotHavePrivileges) {
        throw new UnauthorizedException(
          `You can only delete products that you have created`,
        );
      }

      return { variants, user };
    } catch (error) {
      throw new BadRequestException(
        `${DeleteProductVariantsService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
