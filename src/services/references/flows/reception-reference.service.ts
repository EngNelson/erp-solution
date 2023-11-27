import { UserCon } from '@glosuite/shared';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReceptionItemOutput } from 'src/domain/dto/flows';
import { Reception, Transfert } from 'src/domain/entities/flows';
import { ProductVariant, ProductItem } from 'src/domain/entities/items';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { CommentModel } from 'src/domain/interfaces';
import { MobileUnitModel } from 'src/domain/interfaces/flows/transfert';
import {
  VariantsToReceivedModel,
  ReceptionModel,
} from 'src/domain/types/flows';
import {
  ReceptionRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import {
  ProductVariantRepository,
  ProductItemRepository,
} from 'src/repositories/items';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { MobileUnitService } from 'src/services/generals';
import { SharedService, UserService } from 'src/services/utilities';

@Injectable()
export class ReceptionService {
  constructor(
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    private readonly _sharedService: SharedService,
    private readonly _mobileUnitService: MobileUnitService,
    private readonly _userService: UserService,
  ) {}

  async generateReference(
    reception?: Reception,
    isChild?: boolean,
  ): Promise<string> {
    try {
      let reference: string;

      if (isChild) {
        reference = `${reception.reference}-1`;
      } else {
        const [receptions, count] =
          await this._receptionRepository.findAndCount({
            where: { parent: null },
            withDeleted: true,
          });
        const suffix = this._generateSuffix(count + 1);

        reference = `IN${suffix}`;
      }

      return reference;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  async buildReceptionOutput(reception: Reception): Promise<ReceptionModel> {
    try {
      let transfert: Transfert;

      if (reception.child) {
        reception.child = await this._receptionRepository.findOne({
          where: { id: reception.child.id },
          relations: ['storagePoint', 'child'],
        });
      }

      if (reception.parent) {
        reception.parent = await this._receptionRepository.findOne({
          where: { id: reception.parent.id },
          relations: ['storagePoint', 'child'],
        });
      }

      if (reception.purchaseOrder) {
        reception.purchaseOrder = await this._purchaseOrderRepository.findOne({
          where: { id: reception.purchaseOrderId },
          relations: [
            'child',
            'parent',
            'order',
            'internalNeed',
            'storagePoint',
          ],
        });
      }

      if (reception.mobileUnits?.length > 0) {
        transfert = await this._transfertRepository.findOne({
          where: { id: reception.mobileUnits[0].transfertId },
          relations: ['source', 'target'],
        });

        await Promise.all(
          reception.mobileUnits.map(async (mobileUnit) => {
            const items = await this._productItemRepository.find({
              where: { mobileUnitId: mobileUnit.id },
              relations: ['location', 'supplier', 'productVariant'],
            });

            mobileUnit.productItems = items;

            return mobileUnit;
          }),
        );
      }

      if (reception.productItems?.length > 0) {
        await Promise.all(
          reception.productItems.map(async (productItem) => {
            productItem.productVariant =
              await this._productVariantRepository.findOneOrFail({
                where: { id: productItem.productVariantId },
              });

            return productItem;
          }),
        );
      }

      const variantsToReceived: VariantsToReceivedModel[] = [];
      await Promise.all(
        reception.variantReceptions.map(async (variantReception) => {
          const variant = await this._productVariantRepository.findOne({
            where: { id: variantReception.variantId },
            relations: ['product', 'attributeValues', 'children'],
          });

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          variantsToReceived.push({ variantReception, variantDetails });
        }),
      );

      const mobileUnits: MobileUnitModel[] = [];

      if (reception.mobileUnits && reception.mobileUnits.length > 0) {
        await Promise.all(
          reception.mobileUnits.map(async (mobileUnit) => {
            const mobileUnitModel =
              await this._mobileUnitService.buildMobileUnitModel(mobileUnit);

            mobileUnits.push(mobileUnitModel);
          }),
        );
      }

      const receptionModel: ReceptionModel = {
        reception,
        mobileUnits,
        variantsToReceived,
        transfert,
      };

      return receptionModel;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${this.buildReceptionOutput.name} - ${error.message}`,
      );
    }
  }

  buildOrderComments(
    reception: Reception,
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

      if (reception.comments && reception.comments.length > 0) {
        comments = reception.comments;
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

  private _generateSuffix(total: number): string {
    const suffix = total.toString();
    return suffix.padStart(5, '0');
  }
}
