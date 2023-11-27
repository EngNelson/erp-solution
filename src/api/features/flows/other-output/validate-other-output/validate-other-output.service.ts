import { ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OtherOutputItemOutput } from 'src/domain/dto/flows';
import { OtherOutput, StockMovement } from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Location } from 'src/domain/entities/warehouses';
import {
  MovementType,
  OutputStatus,
  StepStatus,
  StockMovementAreaType,
  TriggeredBy,
  TriggerType,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import {
  OtherOutputRepository,
  StockMovementRepository,
} from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { LocationRepository } from 'src/repositories/warehouses';
import {
  OtherOutputService,
  UpdateMagentoDataService,
} from 'src/services/generals';
import { ValidateOtherOutputInput } from './dto';

type ValidationResult = {
  otherOutput: OtherOutput;
  // withdrawBy: MiniUserPayload;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class ValidateOtherOutputService {
  constructor(
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(StockMovement)
    private readonly _stockMovementRepository: StockMovementRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    private readonly _otherOutputService: OtherOutputService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  async validateOtherOutput(
    input: ValidateOtherOutputInput,
    user: UserCon,
    accessToken: string,
  ): Promise<OtherOutputItemOutput> {
    const validationResult = await this._tryValidation(
      input,
      user,
      accessToken,
    );

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(input, validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: ValidateOtherOutputInput,
    result: ValidationResult,
  ): Promise<OtherOutputItemOutput> {
    try {
      const { otherOutput, user, lang } = result;

      otherOutput.status = OutputStatus.VALIDATED;
      otherOutput.withdrawBy = input.withdrawBy;
      // otherOutput.withdrawedBy = withdrawBy;
      otherOutput.validatedAt = new Date();
      otherOutput.validatedBy = user;

      const productItemsToEdit: ProductItem[] = [];
      const stockMovementsToAdd: StockMovement[] = [];
      const locationsToUpdate: Location[] = [];
      const variantsToEditMagentoQty: ProductVariant[] = [];
      const productsToUpdate: Product[] = [];

      for (const productItem of otherOutput.productItems) {
        const location = await this._locationRepository.findOneOrFail(
          productItem.locationId,
        );

        const stockMovement = new StockMovement();

        stockMovement.movementType = MovementType.OUT;
        stockMovement.triggerType = TriggerType.MANUAL;
        stockMovement.triggeredBy = TriggeredBy.OTHER_OUTPUT;
        stockMovement.sourceType = StockMovementAreaType.LOCATION;
        stockMovement.createdBy = user;

        stockMovement.productItem = productItem;
        stockMovement.productItemId = productItem.id;

        stockMovement.otherOutput = otherOutput;
        stockMovement.otherOutputId = otherOutput.id;

        stockMovement.sourceLocation = productItem.location;
        stockMovement.sourceLocationId = productItem.locationId;

        stockMovementsToAdd.push(stockMovement);

        // Set each location totalItems
        location.totalItems -= 1;
        await this._locationRepository.save(location);

        // Set each product item state, status and location
        productItem.state = ItemState.GOT_OUT;
        productItem.status = StepStatus.IS_OUT;
        productItem.location = null;
        productItem.locationId = null;

        productItemsToEdit.push(productItem);

        // Set products and variants available quantities
        const productVariant =
          await this._productVariantRepository.findOneOrFail({
            where: { id: productItem.productVariantId },
            relations: ['productItems'],
          });

        const product = await this._productRepository.findOneOrFail(
          productVariant.productId,
        );

        productVariant.quantity.reserved -= 1;
        productVariant.quantity.gotOut += 1;
        product.quantity.reserved -= 1;
        product.quantity.gotOut += 1;

        await this._productRepository.save(product);
        await this._productVariantRepository.save(productVariant);

        if (
          !variantsToEditMagentoQty.find(
            (variant) => variant.id === productVariant.id,
          )
        ) {
          variantsToEditMagentoQty.push(productVariant);
        }
      }

      await this._productItemRepository.save(productItemsToEdit);
      await this._stockMovementRepository.save(stockMovementsToAdd);
      await this._locationRepository.save(locationsToUpdate);
      await this._otherOutputRepository.save(otherOutput);

      this._updateMagentoDataService.updateProductsQuantities(
        variantsToEditMagentoQty,
      );

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
        `${ValidateOtherOutputService.name} - ${this._tryExecution.name}: ${error.message}`,
      );
    }
  }

  private async _tryValidation(
    input: ValidateOtherOutputInput,
    user: UserCon,
    accessToken: string,
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

      // Can only validate CONFIRMED output
      if (otherOutput.status !== OutputStatus.CONFIRMED) {
        throw new BadRequestException(
          `The output ${otherOutput.reference} is ${otherOutput.status}. You cannot validate ${otherOutput.status} output.`,
        );
      }

      // Get the pus or fleet agent
      // const path = `${process.env.AUTH_API_PATH}/${USERS_RESOURCE}`;
      // console.log('AUTH ENDPOINT ', path);
      // let withdrawBy: MiniUserPayload;

      // await this._httpService.axiosRef.get(path + `/${input.withdrawBy}`, {
      //   headers: {Authorization: `Bearer ${accessToken}`}
      // }).then(response => {
      //   console.log(
      //     `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
      //     'Data ',
      //     response.data,
      //   );

      //   withdrawBy = {
      //     firstname: response.data.firstname
      //           ? response.data.firstname
      //           : null,
      //         lastname: response.data.lastname,
      //         email: response.data.email,
      //   };
      // }).catch(error => {
      //   throw new HttpException(
      //     error.message,
      //     HttpStatus.INTERNAL_SERVER_ERROR,
      //   );
      // })

      // if (!withdrawBy){
      //   throw new NotFoundException(
      //     `The agent with id ${input.withdrawBy} is not found`,
      //   );
      // }

      return { otherOutput, user, lang };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${ValidateOtherOutputService.name} - ${this._tryValidation.name} - ` +
          error.message,
      );
    }
  }
}
