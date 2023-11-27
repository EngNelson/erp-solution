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
import {
  AgentRoles,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { InternalNeed } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { InternalNeedStatus } from 'src/domain/enums/flows';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { SharedService } from 'src/services/utilities';
import { EditSendedInternalNeedInput } from './dto';

type ValidationResult = {
  internalNeed: InternalNeed;
  response: string;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditSendedInternalNeedService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async editSendedInternalNeed(
    input: EditSendedInternalNeedInput,
    user: UserCon,
  ): Promise<InternalNeedItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<InternalNeedItemOutput> {
    try {
      const { internalNeed, response, lang, user } = result;

      if (!isNullOrWhiteSpace(response)) {
        internalNeed.response = response;
      }

      internalNeed.status = InternalNeedStatus.TO_VERIFY;
      internalNeed.updatedBy = user;

      await this._internalNeedRepository.save(internalNeed);

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
      throw new ConflictException(
        `${EditSendedInternalNeedService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: EditSendedInternalNeedInput,
    user: UserCon,
  ): Promise<ValidationResult> {
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

      if (internalNeed.status === InternalNeedStatus.TO_VERIFY) {
        throw new BadRequestException(
          `The material requisition ${internalNeed.reference} is already at ${InternalNeedStatus.TO_VERIFY}`,
        );
      }

      if (internalNeed.status !== InternalNeedStatus.SENDED) {
        throw new BadRequestException(
          `Sorry ! cannot sent ${InternalNeedStatus.TO_VERIFY} a ${internalNeed.status} material requisition form`,
        );
      }

      if (
        !user.roles.some((role) => role === AgentRoles.DG) &&
        internalNeed.addressTo.email !== user.email
      ) {
        throw new UnauthorizedException(
          `You don't have ability to edit the material requisition form ${internalNeed.reference}`,
        );
      }

      return { internalNeed, response: input.response, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${EditSendedInternalNeedService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
