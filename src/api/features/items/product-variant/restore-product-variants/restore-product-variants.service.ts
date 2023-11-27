import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
import {
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import {
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import {
  RestoreProductVariantOutputItem,
  RestoreProductVariantsInput,
  RestoreProductVariantsOutput,
} from './dto';

@Injectable()
export class RestoreProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttributeValuesRepository: ProductVariantAttributeValuesRepository<any>,
  ) {}

  async restoreProductVariants(
    input: RestoreProductVariantsInput,
    user: UserCon,
  ): Promise<RestoreProductVariantsOutput> {
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
    input: RestoreProductVariantsInput,
    user: UserCon,
  ): Promise<RestoreProductVariantsOutput> {
    try {
      await this._productVariantRepository.restore(input.ids);

      const variants = await this._productVariantRepository.findByIds(
        input.ids,
      );

      if (variants.length < input.ids.length) {
        throw new NotFoundException(
          `Some product variants you are trying to restore are not found`,
        );
      }

      const isUserConHavePrivileges = variants.some(
        (variant) =>
          variant.deletedBy != user &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (!isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only restore product variants that you have deleted before.`,
        );
      }

      variants.forEach(async (variant) => {
        variant.deletedBy = null;

        await this._productVariantRepository.save(variant);

        const variantAttributeValues =
          await this._productVariantAttributeValuesRepository.find({
            where: { variantId: variant.id },
            withDeleted: true,
          });

        variantAttributeValues?.forEach((attrValue) => {
          attrValue.deletedBy = null;
          this._productVariantAttributeValuesRepository.restore(attrValue.id);
        });

        await this._productVariantAttributeValuesRepository.save(
          variantAttributeValues,
        );
      });

      return new RestoreProductVariantsOutput(
        variants.map((variant) => new RestoreProductVariantOutputItem(variant)),
        variants.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${RestoreProductVariantsService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.message,
      );
    }
  }
}
