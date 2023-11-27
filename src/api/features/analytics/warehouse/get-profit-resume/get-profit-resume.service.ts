import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OtherOutput, Reception, Transfert } from 'src/domain/entities/flows';
import { ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationLineState,
  OperationStatus,
  OutputStatus,
  OutputType,
  StepStatus,
  TransfertStatus,
} from 'src/domain/enums/flows';
import {
  OtherOutputRepository,
  ReceptionRepository,
  TransfertRepository,
} from 'src/repositories/flows';
import { ProductVariantRepository } from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { Like } from 'typeorm';
import { GetProfitResumeInput, GetProfitResumeOutput } from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  isStoragePoint: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetProfitResumeService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(Reception)
    private readonly _receptionRepository: ReceptionRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Transfert)
    private readonly _transfertRepository: TransfertRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
  ) {}

  async getProfitResume(
    input: GetProfitResumeInput,
    user: UserCon,
  ): Promise<GetProfitResumeOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult, input);

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
    input: GetProfitResumeInput,
  ): Promise<GetProfitResumeOutput> {
    try {
      const { storagePoint, isStoragePoint, lang, user } = result;
      const year: string = input.year.toString();

      const purchaseAmounts: number[] = this._initArray();
      const saleAmounts: number[] = this._initArray();
      const entries: number[] = this._initArray();
      const outputs: number[] = this._initArray();

      let purchases: PurchaseOrder[] = [];
      let otherOutputs: OtherOutput[] = [];
      let orders: Order[] = [];
      let transfertsOut: Transfert[] = [];
      // let transfertsIn: Transfert[] = [];
      let receptions: Reception[] = [];

      if (isStoragePoint) {
        purchases = await this._purchaseOrderRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: OperationStatus.VALIDATED,
            storagePointId: storagePoint.id,
          },
          relations: ['variantPurchaseds'],
        });

        otherOutputs = await this._otherOutputRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: OutputStatus.VALIDATED,
            storagePointId: storagePoint.id,
          },
          relations: ['variantsToOutput'],
        });

        orders = await this._orderRepository.find({
          where: {
            cashedAt: Like(`${year}-%`),
            orderStatus: StepStatus.COMPLETE,
            storagePointId: storagePoint.id,
          },
          relations: ['articleOrdereds'],
        });

        transfertsOut = await this._transfertRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: TransfertStatus.VALIDATED,
            sourceId: storagePoint.id,
          },
          relations: ['variantTransferts'],
        });

        // transfertsIn = await this._transfertRepository.find({
        //   where: {
        //     validatedAt: Like(`${year}-%`),
        //     status: TransfertStatus.VALIDATED,
        //     targetId: storagePoint.id,
        //   }
        // })

        receptions = await this._receptionRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: OperationStatus.VALIDATED,
            storagePointId: storagePoint.id,
          },
          relations: ['variantReceptions'],
        });
      } else {
        purchases = await this._purchaseOrderRepository.find({
          where: {
            validatedAt: Like(`${year}%`),
            status: OperationStatus.VALIDATED,
          },
          relations: ['variantPurchaseds'],
        });

        otherOutputs = await this._otherOutputRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: OutputStatus.VALIDATED,
          },
          relations: ['variantsToOutput'],
        });

        orders = await this._orderRepository.find({
          where: {
            cashedAt: Like(`${year}-%`),
            orderStatus: StepStatus.COMPLETE,
          },
          relations: ['articleOrdereds'],
        });

        receptions = await this._receptionRepository.find({
          where: {
            validatedAt: Like(`${year}-%`),
            status: OperationStatus.VALIDATED,
          },
          relations: ['variantReceptions'],
        });
      }

      // get purchases amount
      purchases.forEach((purchase) => {
        const month = purchase.validatedAt.getMonth();
        const amounts: number[] = [];

        const variantsPurchased = purchase.variantPurchaseds.filter(
          (variantPurchased) =>
            variantPurchased.state === OperationLineState.VALIDATED,
        );

        variantsPurchased.forEach((variantPurchased) => {
          const amount =
            variantPurchased.purchaseCost * variantPurchased.quantity;
          amounts.push(amount);
        });

        const totalAmount = amounts.reduce((sum, i) => sum + i, 0);

        purchaseAmounts[month] += totalAmount;
      });

      // console.log(purchaseAmounts);

      // get sales amount
      const sales = otherOutputs.filter(
        (otherOutput) =>
          otherOutput.outputType === OutputType.FLEET_OUTPUT ||
          otherOutput.outputType === OutputType.PUS_OUTPUT,
      );

      sales.forEach(async (sale) => {
        const month = sale.validatedAt.getMonth();
        const amounts: number[] = [];

        await Promise.all(
          sale.variantsToOutput.map(async (variantOutput) => {
            const variant = await this._productVariantRepository.findOne(
              variantOutput.productVariantId,
            );

            const amount = variantOutput.quantity * variant.salePrice;
            amounts.push(amount);
          }),
        );

        const totalAmount = amounts.reduce((sum, i) => sum + i, 0);
        saleAmounts[month] += totalAmount;
      });

      orders.forEach(async (order) => {
        const month = order.cashedAt.getMonth();
        const amounts: number[] = [];

        await Promise.all(
          order.articleOrdereds.map((articleOrdered) => {
            const amount = articleOrdered.quantity * articleOrdered.price;
            amounts.push(amount);
          }),
        );

        const totalAmount = amounts.reduce((sum, i) => sum + i, 0);
        saleAmounts[month] += totalAmount;
      });

      // get entries amount
      receptions.forEach((reception) => {
        const month = reception.validatedAt.getMonth();

        const amounts: number[] = [];

        if (
          reception.variantReceptions &&
          reception.variantReceptions.length > 0
        ) {
          reception.variantReceptions?.forEach((variantReception) => {
            const amount =
              variantReception.quantity * variantReception.purchaseCost;
            amounts.push(amount);
          });
        }

        const totalAmount = amounts.reduce((sum, i) => sum + i, 0);
        entries[month] += totalAmount;
      });

      // get outputs amount
      await Promise.all(
        otherOutputs.map(async (otherOutput) => {
          const month = otherOutput.validatedAt.getMonth();
          const amounts: number[] = [];

          if (
            otherOutput.variantsToOutput &&
            otherOutput.variantsToOutput.length > 0
          ) {
            await Promise.all(
              otherOutput.variantsToOutput?.map(async (variantOutput) => {
                const variant = await this._productVariantRepository.findOne(
                  variantOutput.productVariantId,
                );

                const amount = variantOutput.quantity * variant.salePrice;
                amounts.push(amount);
              }),
            );
          }

          const totalAmount = amounts.reduce((sum, i) => sum + i, 0);

          outputs[month] += totalAmount;
        }),
      );

      await Promise.all(
        transfertsOut.map(async (transfert) => {
          const month = transfert.validatedAt.getMonth();
          const amounts: number[] = [];

          if (
            transfert.variantTransferts &&
            transfert.variantTransferts.length > 0
          ) {
            await Promise.all(
              transfert.variantTransferts?.map(async (variantTransfert) => {
                const variant = await this._productVariantRepository.findOne(
                  variantTransfert.variantId,
                );

                const amount = variantTransfert.quantity * variant.purchaseCost;
                amounts.push(amount);
              }),
            );
          }

          const totalAmount = amounts.reduce((sum, i) => sum + i, 0);
          outputs[month] += totalAmount;
        }),
      );

      return new GetProfitResumeOutput(
        input.year,
        purchaseAmounts,
        saleAmounts,
        entries,
        outputs,
        lang,
        storagePoint,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetProfitResumeService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetProfitResumeInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      let storagePoint: StoragePoint;

      if (input.storagePointId && !isNullOrWhiteSpace(input.storagePointId)) {
        storagePoint = await this._storagePointRepository.findOne(
          input.storagePointId,
        );

        if (!storagePoint) {
          throw new NotFoundException(
            `StoragePoint ${input.storagePointId} not found`,
          );
        }
      }

      return { storagePoint, isStoragePoint: !!storagePoint, lang, user };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetProfitResumeService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private _initArray(): number[] {
    const array: number[] = [];

    for (let i = 0; i < 12; i++) {
      array[i] = 0;
    }

    return array;
  }
}
