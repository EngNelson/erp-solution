import { AgentRoles, ISOLang, UserCon } from '@glosuite/shared';
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
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { OtherOutput, Reception } from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import {
  OperationStatus,
  OutputStatus,
  ReceptionType,
  StepStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  OtherOutputRepository,
  ReceptionRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OtherOutputService } from 'src/services/generals';
import { ReceptionService } from 'src/services/references/flows';
import { CancelOtherOutputInput } from './dto';

type ValidationResult = {
  otherOutput: OtherOutput;
  cancelReason: string;
  user: UserCon;
  lang: ISOLang;
};

@Injectable()
export class CancelOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    private readonly _otherOutputService: OtherOutputService,
    private readonly _receptionReferenceService: ReceptionService,
  ) {}

  async cancelOtherOutput(
    input: CancelOtherOutputInput,
    user: UserCon,
  ): Promise<OtherOutputItemOutput> {
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
  ): Promise<OtherOutputItemOutput> {
    try {
      const { otherOutput, cancelReason, user, lang } = result;

      const productItemsToEdit: ProductItem[] = [];

      if (otherOutput.status !== OutputStatus.PENDING) {
        await Promise.all(
          otherOutput.productItems.map(async (productItem) => {
            productItem.state = ItemState.PENDING_RECEPTION;
            productItem.status = StepStatus.TO_RECEIVED;

            productItemsToEdit.push(productItem);

            // Set products and variants available quantities
            const productVariant =
              await this._productVariantRepository.findOneOrFail(
                productItem.productVariantId,
              );

            const product = await this._productRepository.findOneOrFail(
              productVariant.productId,
            );

            if (otherOutput.status === OutputStatus.CONFIRMED) {
              productVariant.quantity.reserved -= 1;
              productVariant.quantity.pendingReception += 1;
              product.quantity.reserved -= 1;
              product.quantity.pendingReception += 1;
            }

            if (otherOutput.status === OutputStatus.VALIDATED) {
              productVariant.quantity.gotOut -= 1;
              productVariant.quantity.pendingReception += 1;
              product.quantity.gotOut -= 1;
              product.quantity.pendingReception += 1;
            }

            await this._productRepository.save(product);
            await this._productVariantRepository.save(productVariant);
          }),
        );

        await this._productItemRepository.save(productItemsToEdit);

        const reception = new Reception();

        reception.reference =
          await this._receptionReferenceService.generateReference();
        reception.type = ReceptionType.INTERNAL_PROBLEM;
        reception.status = OperationStatus.PENDING;
        reception.cancelReason = cancelReason;
        reception.productItems = productItemsToEdit;
        reception.otherOutput = otherOutput;

        reception.storagePoint = otherOutput.storagePoint;
        reception.storagePointId = otherOutput.storagePointId;

        reception.createdBy = user;

        await this._receptionRepository.save(reception);
      }

      otherOutput.status = OutputStatus.CANCELED;
      otherOutput.canceledAt = new Date();
      otherOutput.cancelReason = cancelReason;
      otherOutput.canceledBy = user;

      await this._otherOutputRepository.save(otherOutput);

      /**
       * Build and return the output
       */
      const output = await this._otherOutputRepository.findOneOrFail(
        otherOutput.id,
        {
          relations: [
            'storagePoint',
            'variantsToOutput',
            'productItems',
            'stockMovements',
          ],
        },
      );

      const otherOutputModel =
        await this._otherOutputService.buildOtherOutputOutput(output);

      return new OtherOutputItemOutput(otherOutputModel, lang);
    } catch (error) {
      console.log(error);
      throw new ConflictException(
        `${CancelOtherOutputService.name} - ${this._tryExecution.name}: ${error.message}`,
      );
    }
  }

  private async _tryValidation(
    input: CancelOtherOutputInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      /**
       * Get the otherOutput to validate
       */
      const otherOutput = await this._otherOutputRepository.findOne(
        { reference: input.outputReference },
        { relations: ['storagePoint', 'variantsToOutput', 'productItems'] },
      );

      if (!otherOutput) {
        throw new NotFoundException(
          `Output of reference ${input.outputReference} is not found`,
        );
      }

      if (otherOutput.status === OutputStatus.CANCELED) {
        throw new BadRequestException(
          `The output ${otherOutput.reference} has already been canceled.`,
        );
      }

      if (
        otherOutput.status === OutputStatus.VALIDATED &&
        !user.roles.some((role) => role === AgentRoles.WAREHOUSE_MANAGER)
      ) {
        throw new UnauthorizedException(
          `You are not allowed to cancel a ${otherOutput.status} output.`,
        );
      }

      return { otherOutput, cancelReason: input.cancelReason, user, lang };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${CancelOtherOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
