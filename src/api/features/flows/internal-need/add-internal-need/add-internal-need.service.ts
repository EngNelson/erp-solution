import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AgentRoles,
  DEFAULT_RATIO_VALUE,
  FROM_EMAIL,
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  UserCon,
} from '@glosuite/shared';
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { InternalNeed, VariantNeeded } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import {
  InternalNeedStatus,
  InternalNeedUsage,
  StatusLine,
} from 'src/domain/enums/flows';
import { ProductType } from 'src/domain/enums/items';
import { CommentModel, EmailInputModel } from 'src/domain/interfaces';
import { ProductVariantNeededModel } from 'src/domain/interfaces/flows';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import {
  InternalNeedRepository,
  VariantNeededRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SendingEmailService } from 'src/services/email';
import { InternalNeedReferenceService } from 'src/services/references/flows';
import { SharedService, UserService } from 'src/services/utilities';
import { AddInternalNeedInput } from './dto';
import { EmailTemplateName } from 'src/domain/enums/email';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';
import { HttpService } from '@nestjs/axios';

type ValidationResult = {
  variantNeededs: ProductVariantNeededModel[];
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class AddInternalNeedService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(VariantNeeded)
    private readonly _variantNeededRepository: VariantNeededRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sharedService: SharedService,
    private readonly _internalNeedReferenceService: InternalNeedReferenceService,
    private readonly _sendingEmailService: SendingEmailService,
    private readonly _httpService: HttpService,
    private readonly _userService: UserService,
  ) {}

  async addInternalNeed(
    input: AddInternalNeedInput,
    user: UserCon,
    accessToken: string,
  ): Promise<InternalNeedItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      validationResult,
      accessToken,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddInternalNeedInput,
    result: ValidationResult,
    accessToken,
  ): Promise<InternalNeedItemOutput> {
    const internalNeed = new InternalNeed();

    try {
      const { variantNeededs, lang, user } = result;

      internalNeed.reference =
        await this._internalNeedReferenceService.generate();
      internalNeed.usage = input.usage;
      if (input.service && !isNullOrWhiteSpace(input.service)) {
        internalNeed.service = input.service;
      }

      if (input.department && !isNullOrWhiteSpace(input.department)) {
        internalNeed.department = input.department;
      }

      if (input.employee) {
        internalNeed.employee = input.employee;
      }

      if (input.comment && !isNullOrWhiteSpace(input.comment)) {
        const comment: CommentModel = {
          position: 0,
          content: input.comment,
          addBy: this._userService.getMiniUserCon(user),
          createdAt: new Date(),
        };

        internalNeed.comments = [comment];
      }

      internalNeed.addressTo = input.addressTo;
      internalNeed.reason = input.reason;
      internalNeed.createdBy = user;

      await this._internalNeedRepository.save(internalNeed);

      /**
       * Save variants neededs
       * and build variantNeededsModel
       */
      const variantNeededsToAdd: VariantNeeded[] = [];
      const variantNeededsModel: VariantNeededModel[] = [];
      const position = 0;
      const values: number[] = [];

      await Promise.all(
        variantNeededs.map(async (variantNeededItem) => {
          const { productVariant, quantity } = variantNeededItem;

          const variantNeeded = new VariantNeeded();

          variantNeeded.productVariant = productVariant;
          variantNeeded.productVariantId = productVariant.id;
          variantNeeded.position = position;
          variantNeeded.quantity = quantity;
          variantNeeded.value =
            DEFAULT_RATIO_VALUE * quantity * productVariant.salePrice;
          variantNeeded.status = StatusLine.TO_PICK_PACK;
          variantNeeded.internalNeed = internalNeed;
          variantNeeded.internalNeedId = internalNeed.id;

          variantNeeded.createdBy = user;

          variantNeededsToAdd.push(variantNeeded);

          const variantDetails =
            await this._sharedService.buildPartialVariantOutput(productVariant);

          const locations =
            await this._sharedService.buildPickPackLocationsOutput(
              productVariant,
            );

          variantNeededsModel.push({
            variantNeeded,
            variantDetails,
            locations,
          });
          values.push(variantNeeded.value);
        }),
      );

      await this._variantNeededRepository.save(variantNeededsToAdd);

      internalNeed.variantNeededs = variantNeededsToAdd;
      internalNeed.totalValue = values.reduce(
        (sum, current) => sum + current,
        0,
      );

      await this._internalNeedRepository.save(internalNeed);

      const internalNeedModel: InternalNeedModel = {
        internalNeed,
        variantNeededs: variantNeededsModel,
      };

      if (input.sendMail) {
        /**
         * Send the mail here
         */

        const sendEmailTo: string[] = [];

        const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
        console.log('AUTH ENDPOINT ', path);

        await this._httpService.axiosRef
          .get(path + `?roles=${AgentRoles.WAREHOUSE_MANAGER}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Accept-Encoding': 'gzip,deflate,compress',
            },
          })
          .then((response) => {
            console.log(
              `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
              'Data ',
              response.data,
            );

            response.data.items.map((item) => {
              if (item) {
                sendEmailTo.push(item.email);
              }
            });
          })
          .catch((error) => {
            throw new HttpException(
              error.message,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          });

        sendEmailTo.unshift(input.addressTo.email);

        if (sendEmailTo.length > 0) {
          console.log(`Send mail to ${sendEmailTo}`);

          const context = new InternalNeedItemOutput(internalNeedModel, lang);

          const emailInput: EmailInputModel = {
            to: sendEmailTo,
            from: FROM_EMAIL,
            subject: 'Material Requisition Form',
          };

          try {
            const send = await this._sendingEmailService.sendEmailWithTemplate(
              emailInput,
              EmailTemplateName.INTERNAL_NEED,
              context,
            );

            if (send) {
              internalNeed.status = InternalNeedStatus.SENDED;
              console.log('Mail sent successfully');
            }
          } catch (error) {
            console.log(
              `Error sending email: ${error} - ${AddInternalNeedService.name} - ${this._tryExecution.name}`,
            );
          }
        }
      } else {
        internalNeed.status = InternalNeedStatus.SAVED;
      }

      await this._internalNeedRepository.save(internalNeed);

      return new InternalNeedItemOutput(internalNeedModel, lang);
    } catch (error) {
      if (internalNeed.id) {
        await this._internalNeedRepository.delete(internalNeed.id);
      }
      throw new ConflictException(
        `${AddInternalNeedService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddInternalNeedInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * AddressTo input validation
       * internalNeed must be address to DAF, DG or Service manger
       */
      if (
        !input.addressTo.roles.some(
          (role) => role === AgentRoles.DG || role === AgentRoles.DAF,
        ) &&
        !input.addressTo.workStation?.isManager
      ) {
        throw new BadRequestException(
          `Sorry your demand should only be address to ${AgentRoles.DG} or ${AgentRoles.DAF} or a service manager`,
        );
      }

      if (
        input.usage === InternalNeedUsage.FOR_SERVICE &&
        isNullOrWhiteSpace(input.service)
      ) {
        throw new BadRequestException(
          `Service is required for ${InternalNeedUsage.FOR_SERVICE} demand`,
        );
      }

      if (
        input.usage === InternalNeedUsage.FOR_DEPARTMENT &&
        (isNullOrWhiteSpace(input.service) ||
          isNullOrWhiteSpace(input.department))
      ) {
        throw new BadRequestException(
          `Service and department are required for ${InternalNeedUsage.FOR_DEPARTMENT} material requisition`,
        );
      }

      if (
        input.usage === InternalNeedUsage.FOR_EMPLOYEE &&
        (isNullOrWhiteSpace(input.service) ||
          isNullOrWhiteSpace(input.department) ||
          !input.employee)
      ) {
        throw new BadRequestException(
          `Service, department and employee are required for ${InternalNeedUsage.FOR_EMPLOYEE} material requisition`,
        );
      }

      /**
       * Variants neededs validation
       */
      const variantNeededs: ProductVariantNeededModel[] = [];

      await Promise.all(
        input.variantNeededs.map(async (variantNeeded) => {
          const { variantId, quantity } = variantNeeded;

          const productVariant = await this._productVariantRepository.findOne(
            variantId,
            {
              relations: [
                'product',
                'attributeValues',
                'productItems',
                'children',
              ],
            },
          );
          if (!productVariant) {
            throw new NotFoundException(
              `Product variant with id ${variantId} not found`,
            );
          }

          if (productVariant.product.productType !== ProductType.SIMPLE) {
            throw new BadRequestException(
              `${getLangOrFirstAvailableValue(
                productVariant.title,
                ISOLang.FR,
              )} is a ${
                productVariant.product.productType
              } product. You cannot add it to an internal need`,
            );
          }

          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new HttpException(
              `Invalid fields: quantity ${quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const variantNeededItem: ProductVariantNeededModel = {
            productVariant,
            quantity,
          };

          variantNeededs.push(variantNeededItem);
        }),
      );

      return { variantNeededs, lang, user };
    } catch (error) {
      throw new BadRequestException(
        `${AddInternalNeedService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
