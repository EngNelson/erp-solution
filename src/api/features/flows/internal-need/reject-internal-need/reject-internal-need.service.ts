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
import { InternalNeedStatus } from 'src/domain/enums/flows';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SharedService } from 'src/services/utilities';
import { RejectInternalNeedInput } from './dto';

@Injectable()
export class RejectInternalNeedService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async rejectInternalNeed(
    input: RejectInternalNeedInput,
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
    input: RejectInternalNeedInput,
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
        throw new NotFoundException(`Material requisition form not found`);
      }

      /**
       * Is user has authorization
       */
      if (
        !user.roles.some((role) => role === AgentRoles.DG) &&
        internalNeed.addressTo.email !== user.email
      ) {
        throw new UnauthorizedException(
          `You are not allowed to perform this action`,
        );
      }

      /**
       * Can only reject SENDED internal Need
       */
      if (internalNeed.status !== InternalNeedStatus.SENDED) {
        throw new BadRequestException(
          `You cannot reject the material requisition form ${internalNeed.reference}. It's already ${internalNeed.status}`,
        );
      }

      internalNeed.status = InternalNeedStatus.REJECTED;
      internalNeed.rejectedBy = user;
      internalNeed.rejectedAt = new Date();

      await this._internalNeedRepository.save(internalNeed);

      const variantNeededs: VariantNeededModel[] = [];
      await Promise.all(
        internalNeed.variantNeededs.map(async (variantNeeded) => {
          const variant = await this._productVariantRepository.findOne(
            variantNeeded.productVariantId,
            { relations: ['product', 'attributeValues', 'productItems'] },
          );

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(variant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(variant);

          variantNeededs.push({ variantNeeded, variantDetails, locations });
        }),
      );

      const internalNeedModel: InternalNeedModel = {
        internalNeed,
        variantNeededs,
      };

      return new InternalNeedItemOutput(internalNeedModel, lang);
    } catch (error) {
      throw new BadRequestException(
        `${RejectInternalNeedService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
