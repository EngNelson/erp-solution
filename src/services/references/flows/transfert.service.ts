import { UserCon } from '@glosuite/shared';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Transfert } from 'src/domain/entities/flows';
import { ProductVariant, ProductItem } from 'src/domain/entities/items';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { ItemState } from 'src/domain/enums/items';
import { AvailabilityStatus } from 'src/domain/enums/orders';
import {
  CommentModel,
  EditedVariantsToTransfertModel,
} from 'src/domain/interfaces';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import {
  VariantsAvailabilities,
  VariantAvailability,
} from 'src/domain/interfaces/orders';
import {
  VariantsToTransfertModel,
  TransfertModel,
} from 'src/domain/types/flows';
import { TransfertRepository } from 'src/repositories/flows';
import {
  ProductVariantRepository,
  ProductItemRepository,
} from 'src/repositories/items';
import { MobileUnitService, StoragePointService } from 'src/services/generals';
import { SharedService, UserService } from 'src/services/utilities';

@Injectable()
export class TransfertService {
  constructor(
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    private readonly _sharedService: SharedService,
    private readonly _mobileUnitService: MobileUnitService,
    private readonly _userService: UserService,
    private readonly _storagePointService: StoragePointService,
  ) {}

  async generateReference(parent?: Transfert): Promise<string> {
    try {
      let reference: string;

      if (parent) {
        reference = `${parent.reference}-1`;
      } else {
        const [transferts, count] =
          await this._transfertRepository.findAndCount({
            where: { parent: null },
            withDeleted: true,
          });
        const suffix = await this._sharedService.generateSuffix(count + 1, 5);

        reference = `TRF${suffix}`;
      }

      return reference;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  async buildTransfertOutput(transfert: Transfert): Promise<TransfertModel> {
    try {
      const variantsToTransfert: VariantsToTransfertModel[] = [];

      await Promise.all(
        transfert.variantTransferts.map(async (variantTransfert) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: variantTransfert.variantId },
            relations: [
              'product',
              'attributeValues',
              'productItems',
              'children',
            ],
          });

          const variantItems: string[] = [];
          variant.productItems?.map((item) => variantItems.push(item.barcode));

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          variantsToTransfert.push({
            variantTransfert,
            variantDetails,
            locations,
          });
        }),
      );

      if (transfert.mobileUnits && transfert.mobileUnits.length > 0) {
        await Promise.all(
          transfert.mobileUnits.map(async (mobileUnit) => {
            mobileUnit.productItems = await this._productItemRepository.find({
              where: { mobileUnitId: mobileUnit.id },
              relations: ['location', 'supplier', 'productVariant'],
            });

            return mobileUnit;
          }),
        );
      }

      const mobileUnits: MobileUnitModel[] = [];

      if (transfert.mobileUnits && transfert.mobileUnits.length > 0) {
        await Promise.all(
          transfert.mobileUnits.map(async (mobileUnit) => {
            const mobileUnitModel =
              await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

            mobileUnits.push(mobileUnitModel);
          }),
        );
      }

      const transfertModel: TransfertModel = {
        transfert,
        mobileUnits,
        variantsToTransfert,
      };

      return transfertModel;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `An error occured : ${this.buildTransfertOutput.name} - ${error.message}`,
      );
    }
  }

  buildOrderComments(
    transfert: Transfert,
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

      if (transfert.comments && transfert.comments.length > 0) {
        comments = transfert.comments;
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

  async checkVariantsAvailabilities(
    variantsToTransfert: EditedVariantsToTransfertModel[],
    storagePoint: StoragePoint,
  ): Promise<VariantsAvailabilities> {
    try {
      const variantsAvailabilities: VariantsAvailabilities = {
        status: null,
        availabilities: [],
      };

      for (const variantToTransfert of variantsToTransfert) {
        const { productVariant, newQuantity, ...data } = variantToTransfert;

        const locations =
          await this._storagePointService.getStoragePointLocations(
            storagePoint,
          );

        const foundQty = productVariant.productItems.filter(
          (productItem) =>
            productItem.state === ItemState.AVAILABLE &&
            locations.some(
              (location) => location.id === productItem.locationId,
            ),
        ).length;

        const variantAvailability: VariantAvailability = {
          variant: productVariant,
          missingQty: foundQty > newQuantity ? 0 : newQuantity - foundQty,
        };

        variantsAvailabilities.availabilities.push(variantAvailability);
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty !== 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.ALL;
      }

      if (
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        ) &&
        variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty > 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.SOME;
      }

      if (
        !variantsAvailabilities.availabilities.some(
          (availability) => availability.missingQty === 0,
        )
      ) {
        variantsAvailabilities.status = AvailabilityStatus.NONE;
      }

      return variantsAvailabilities;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
