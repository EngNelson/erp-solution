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
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { InternalNeed } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { SharedService } from 'src/services/utilities';
import { GetInternalNeedByIdInput } from './dto';

@Injectable()
export class GetInternalNeedByIdService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async getInternalNeedById(
    input: GetInternalNeedByIdInput,
    user: UserCon,
  ): Promise<InternalNeedItemOutput> {
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
    input: GetInternalNeedByIdInput,
    user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const internalNeed = await this._internalNeedRepository.findOne(
        input.internalNeedId,
        {
          relations: ['storagePoint', 'variantNeededs', 'purchaseOrder'],
        },
      );

      if (!internalNeed) {
        throw new NotFoundException(
          `Marterial requisition form with id '${input.internalNeedId}' not found`,
        );
      }

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.DG ||
            role === AgentRoles.DAF ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        ) &&
        !user.workStation.isManager
      ) {
        throw new UnauthorizedException(
          `You don't have access on this. You are not a ${AgentRoles.SUPER_ADMIN} or an ${AgentRoles.ADMIN} or ${AgentRoles.DG} or ${AgentRoles.DAF} or a service manager`,
        );
      }

      if (
        !user.roles.some(
          (role) =>
            role === AgentRoles.SUPER_ADMIN ||
            role === AgentRoles.ADMIN ||
            role === AgentRoles.DG ||
            role === AgentRoles.DAF ||
            role === AgentRoles.WAREHOUSE_MANAGER,
        ) &&
        user.email !== internalNeed.createdBy.email
      ) {
        throw new UnauthorizedException(
          `You cannot access this material requisition details. You are not the owner`,
        );
      }

      const variantNeededs: VariantNeededModel[] = [];
      await Promise.all(
        internalNeed.variantNeededs.map(async (variantNeeded) => {
          const variant = await this._productVariantRepository.findOne(
            variantNeeded.productVariantId,
            {
              relations: [
                'product',
                'attributeValues',
                'productItems',
                'children',
              ],
            },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          variantNeededs.push({ variantNeeded, variantDetails, locations });
        }),
      );

      if (internalNeed.purchaseOrder) {
        internalNeed.purchaseOrder =
          await this._purchaseOrderRepository.findOne(
            internalNeed.purchaseOrder.id,
            { relations: ['storagePoint', 'child'] },
          );
      }

      const internalNeedModel: InternalNeedModel = {
        internalNeed,
        variantNeededs,
      };

      return new InternalNeedItemOutput(internalNeedModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${GetInternalNeedByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
