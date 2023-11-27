import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, FROM_EMAIL, ISOLang, UserCon } from '@glosuite/shared';
import { InternalNeedItemOutput } from 'src/domain/dto/flows';
import { InternalNeed } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { InternalNeedStatus } from 'src/domain/enums/flows';
import { EmailInputModel } from 'src/domain/interfaces';
import { InternalNeedModel, VariantNeededModel } from 'src/domain/types/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { SendingEmailService } from 'src/services/email';
import { SharedService } from 'src/services/utilities';
import { SendInternalNeedInput } from './dto';
import { EmailTemplateName } from 'src/domain/enums/email';
import { HttpService } from '@nestjs/axios';
import { USERS_RESOURCE } from 'src/domain/constants/public.constants';

@Injectable()
export class SendInternalNeedService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    private readonly _sendingEmailService: SendingEmailService,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
  ) {}

  async sendInternalNeed(
    input: SendInternalNeedInput,
    user: UserCon,
    accessToken: string,
  ): Promise<InternalNeedItemOutput> {
    const result = await this._tryExecution(input, user, accessToken);

    if (!result) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return result;
  }

  private async _tryExecution(
    input: SendInternalNeedInput,
    user: UserCon,
    accessToken: string,
  ): Promise<InternalNeedItemOutput> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const internalNeed = await this._internalNeedRepository.findOne(
        input.internalNeedId,
        { relations: ['variantNeededs'] },
      );

      if (!internalNeed) {
        throw new NotFoundException(`Material requisition form not found`);
      }

      /**
       * Check if the user is the owner of the material requisition form
       */
      if (user.email !== internalNeed.createdBy.email) {
        throw new UnauthorizedException(
          `Sorry you cannot send this material requisition form since your are not the owner`,
        );
      }

      /**
       * Can only send SAVED internalNeed
       */
      if (internalNeed.status !== InternalNeedStatus.SAVED) {
        throw new BadRequestException(
          `Cannot send material requisition form ${internalNeed.reference}. It's already ${internalNeed.status}`,
        );
      }

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

      sendEmailTo.unshift(internalNeed.addressTo.email);

      if (sendEmailTo.length > 0) {
        console.log(`Send mail to ${sendEmailTo}`);

        const emailInput: EmailInputModel = {
          to: sendEmailTo,
          from: FROM_EMAIL,
          subject: 'Material Requisition Form',
        };

        const context = new InternalNeedItemOutput(internalNeedModel, lang);

        try {
          const send = await this._sendingEmailService.sendEmailWithTemplate(
            emailInput,
            EmailTemplateName.INTERNAL_NEED,
            context,
          );

          if (send) {
            internalNeed.status = InternalNeedStatus.SENDED;
            console.log(`Email sent to ${emailInput.to}`);
          }
        } catch (error) {
          console.log(
            `Error sending email: ${error} - ${SendInternalNeedService.name} - ${this._tryExecution.name}`,
          );
        }
      }

      await this._internalNeedRepository.save(internalNeed);

      return new InternalNeedItemOutput(internalNeedModel, lang);
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${SendInternalNeedService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
