import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MiniUserCon, UserCon, isNullOrWhiteSpace } from '@glosuite/shared';
import { OtherOutput } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Supplier } from 'src/domain/entities/purchases';
import { Location } from 'src/domain/entities/warehouses';
import {
  OtherOutputModel,
  VariantToOutputModel,
} from 'src/domain/interfaces/flows';
import { OtherOutputRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SupplierRepository } from 'src/repositories/purchases';
import { LocationRepository } from 'src/repositories/warehouses';
import { SharedService, UserService } from '../utilities';
import { CommentModel } from 'src/domain/interfaces';

@Injectable()
export class OtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    private readonly _sharedService: SharedService,
    private readonly _userService: UserService,
  ) {}

  async generateReference(
    parent?: OtherOutput,
    isChild?: boolean,
  ): Promise<string> {
    try {
      let reference: string;

      if (isChild) {
        reference = `${parent.reference}-1`;
      } else {
        const [otherOutputs, position] =
          await this._otherOutputRepository.findAndCount();
        const suffix = await this._sharedService.generateSuffix(
          position + 1,
          6,
        );

        reference = `OUT-${suffix}`;
      }

      return reference;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference: ${this.generateReference.name}` +
          error.message,
      );
    }
  }

  async generateBarCode(): Promise<string> {
    try {
      const otherOutputs = await this._otherOutputRepository.find();
      let barcode: string;
      let isBarcodeExist = true;

      do {
        barcode = (await this._sharedService.randomNumber(13)).toString();
        isBarcodeExist = otherOutputs.some(
          (order) => order.barcode === barcode,
        );
      } while (isBarcodeExist);

      return barcode;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${this.generateBarCode.name}-${error.message}`,
      );
    }
  }

  async buildOtherOutputOutput(
    otherOutput: OtherOutput,
  ): Promise<OtherOutputModel> {
    try {
      const variantsToOutput: VariantToOutputModel[] = [];

      await Promise.all(
        otherOutput.variantsToOutput.map(async (variantToOutput) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: variantToOutput.productVariantId },
            relations: ['product', 'attributeValues', 'productItems'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          variantsToOutput.push({ variantToOutput, variantDetails, locations });
        }),
      );

      await Promise.all(
        otherOutput?.productItems.map(async (productItem) => {
          if (!isNullOrWhiteSpace(productItem.productVariantId)) {
            productItem.productVariant =
              await this._productVariantRepository.findOneOrFail({
                where: { id: productItem.productVariantId },
              });
          }

          if (!isNullOrWhiteSpace(productItem.locationId)) {
            productItem.location = await this._locationRepository.findOneOrFail(
              { where: { id: productItem.locationId } },
            );
          }

          if (!isNullOrWhiteSpace(productItem.supplierId)) {
            productItem.supplier = await this._supplierRepository.findOneOrFail(
              { where: { id: productItem.supplierId } },
            );
          }

          return productItem;
        }),
      );

      const otherOutputModel: OtherOutputModel = {
        otherOutput,
        variantsToOutput,
      };

      return otherOutputModel;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${this.buildOtherOutputOutput.name} - ${error.message}`,
      );
    }
  }

  buildOrderComments(
    otherOutput: OtherOutput,
    comment: string,
    user: UserCon,
  ): CommentModel[] {
    try {
      let comments: CommentModel[] = [];

      const commentItem = {
        position: comments.length,
        content: comment,
        addBy: this._userService.getMiniUserCon(user),
        createdAt: new Date(),
      };

      if (otherOutput.comments && otherOutput.comments.length > 0) {
        comments = otherOutput.comments;
        comments.push(commentItem);
      } else {
        comments = [commentItem];
      }

      return comments;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
