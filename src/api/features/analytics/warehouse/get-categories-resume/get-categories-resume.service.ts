import { isNullOrWhiteSpace, ISOLang, Status, UserCon } from '@glosuite/shared';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GetLocationsByStoragePointInput } from 'src/api/features/warehouses/storage-point/get-locations-by-storage-point/dto';
import { GetLocationsByStoragePointService } from 'src/api/features/warehouses/storage-point/get-locations-by-storage-point/get-locations-by-storage-point.service';
import { OtherOutput } from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
} from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { PurchaseOrder } from 'src/domain/entities/purchases';
import { Category } from 'src/domain/entities/structures';
import { StoragePoint } from 'src/domain/entities/warehouses';
import {
  OperationLineState,
  OperationStatus,
  OutputStatus,
  OutputType,
  StepStatus,
} from 'src/domain/enums/flows';
import { ItemState } from 'src/domain/enums/items';
import { CategoryData } from 'src/domain/interfaces/structures';
import { OtherOutputRepository } from 'src/repositories/flows';
import {
  ProductItemRepository,
  ProductRepository,
  ProductVariantRepository,
} from 'src/repositories/items';
import { OrderRepository } from 'src/repositories/orders';
import { PurchaseOrderRepository } from 'src/repositories/purchases';
import {
  CategoryRepository,
  CategoryTreeRepository,
} from 'src/repositories/structures';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { GetCategoriesResumeInput, GetCategoriesResumeOutput } from './dto';

type ValidationResult = {
  storagePoint: StoragePoint;
  isStoragePoint: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetCategoriesResumeService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(PurchaseOrder)
    private readonly _purchaseOrderRepository: PurchaseOrderRepository,
    @InjectRepository(OtherOutput)
    private readonly _otherOutputRepository: OtherOutputRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
    private readonly _getStoragePointLocationsService: GetLocationsByStoragePointService,
  ) {}

  async getCategoriesResume(
    input: GetCategoriesResumeInput,
    user: UserCon,
  ): Promise<GetCategoriesResumeOutput> {
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
  ): Promise<GetCategoriesResumeOutput> {
    try {
      const { storagePoint, isStoragePoint, lang, user } = result;

      let productItems: ProductItem[] = [];
      let purchaseOrders: PurchaseOrder[] = [];
      let otherOutputs: OtherOutput[] = [];
      let orders: Order[] = [];

      const categoriesData: CategoryData[] = [];

      if (isStoragePoint) {
        const input: GetLocationsByStoragePointInput = {
          storagePointId: storagePoint.id,
        };
        const locationsOutput =
          await this._getStoragePointLocationsService.getLocationsByStoragePoint(
            input,
            user,
          );

        if (locationsOutput.items && locationsOutput.items.length > 0) {
          await Promise.all(
            locationsOutput.items.map(async (locationOutput) => {
              const items = await this._productItemRepository.find({
                where: { locationId: locationOutput.id },
                relations: ['productVariant'],
              });

              productItems.push(...items);
            }),
          );
        }

        purchaseOrders = await this._purchaseOrderRepository.find({
          where: {
            status: OperationStatus.VALIDATED,
            storagePointId: storagePoint.id,
          },
          relations: ['variantPurchaseds'],
        });

        otherOutputs = await this._otherOutputRepository.find({
          where: {
            status: OutputStatus.VALIDATED,
            storagePointId: storagePoint.id,
          },
          relations: ['variantsToOutput'],
        });

        orders = await this._orderRepository.find({
          where: {
            orderStatus: StepStatus.COMPLETE,
            storagePointId: storagePoint.id,
          },
          relations: ['articleOrdereds'],
        });
      } else {
        productItems = await this._productItemRepository.find({
          relations: ['productVariant'],
        });

        purchaseOrders = await this._purchaseOrderRepository.find({
          where: { status: OperationStatus.VALIDATED },
          relations: ['variantPurchaseds'],
        });

        otherOutputs = await this._otherOutputRepository.find({
          where: {
            status: OutputStatus.VALIDATED,
          },
          relations: ['variantsToOutput'],
        });

        orders = await this._orderRepository.find({
          where: {
            orderStatus: StepStatus.COMPLETE,
          },
          relations: ['articleOrdereds'],
        });
      }

      // get categories data
      const categories = await this._categoryRepository.find({
        where: {
          status: Status.ENABLED,
          addInStatistics: true,
        },
      });

      categories.forEach((category) => {
        const categoryData: CategoryData = {
          id: category.id,
          title: category.title,
        };
        categoriesData.push(categoryData);
      });

      // console.log(categoriesData);

      const etats: number[] = this._initArray(categoriesData);
      const defectueux: number[] = this._initArray(categoriesData);
      const purchases: number[] = this._initArray(categoriesData);
      const sales: number[] = this._initArray(categoriesData);
      const inTransit: number[] = this._initArray(categoriesData);

      // build stock values (en etat et defectueux)
      await Promise.all(
        productItems.map(async (productItem) => {
          const parentsData = await this._getItemParentCategories(productItem);
          const stockValue = productItem.purchaseCost;
          const indexes: number[] = [];

          parentsData.forEach((parent) => {
            let index = 0;
            categoriesData.forEach((categoty) => {
              if (parent.id === categoty.id) {
                indexes.push(index);
              }
              index++;
            });
          });

          if (
            productItem.state === ItemState.AVAILABLE ||
            productItem.state === ItemState.RESERVED
          ) {
            indexes.forEach((index) => (etats[index] += stockValue));
          }

          if (productItem.state === ItemState.IN_TRANSIT) {
            indexes.forEach((index) => (inTransit[index] += stockValue));
          }

          if (productItem.state === ItemState.IS_DEAD) {
            indexes.forEach((index) => (defectueux[index] += stockValue));
          }
        }),
      );

      // build purchases
      await Promise.all(
        purchaseOrders.map(async (purchaseOrder) => {
          const variantsPurchased = purchaseOrder.variantPurchaseds.filter(
            (variantPurchased) =>
              variantPurchased.state === OperationLineState.VALIDATED,
          );

          const parentsData: CategoryData[] = [];
          const values: number[] = [];

          await Promise.all(
            variantsPurchased.map(async (variantPurchased) => {
              const variant = await this._productVariantRepository.findOne({
                where: { id: variantPurchased.variantId },
                relations: ['product'],
              });

              const product = await this._productRepository.findOne({
                where: { id: variant.productId },
                relations: ['categories'],
              });

              let parents: Category[] = [];

              await Promise.all(
                product.categories.map(async (category) => {
                  parents = await this._categoryTreeRepository.findAncestors(
                    category,
                  );
                }),
              );

              parents = parents.filter((parent) => parent.addInStatistics);

              parents.forEach((parent) =>
                parentsData.push({ id: parent.id, title: parent.title }),
              );

              const value =
                variantPurchased.purchaseCost * variantPurchased.quantity;
              values.push(value);
            }),
          );

          const stockValue = values.reduce((sum, i) => sum + i, 0);
          const indexes: number[] = [];

          parentsData.forEach((parent) => {
            let index = 0;
            categoriesData.forEach((categoty) => {
              if (parent.id === categoty.id) {
                indexes.push(index);
              }
              index++;
            });
          });

          indexes.forEach((index) => (purchases[index] += stockValue));
        }),
      );

      // build sales
      const salesOutput = otherOutputs.filter(
        (otherOutput) =>
          otherOutput.outputType === OutputType.FLEET_OUTPUT ||
          otherOutput.outputType === OutputType.PUS_OUTPUT,
      );

      await Promise.all(
        salesOutput.map(async (saleOutput) => {
          const parentsData: CategoryData[] = [];
          const values: number[] = [];
          const indexes: number[] = [];

          await Promise.all(
            saleOutput.variantsToOutput.map(async (variantOutput) => {
              const variant = await this._productVariantRepository.findOne({
                where: { id: variantOutput.productVariantId },
                relations: ['product'],
              });

              const product = await this._productRepository.findOne({
                where: { id: variant.productId },
                relations: ['categories'],
              });

              let parents: Category[] = [];

              await Promise.all(
                product.categories.map(async (category) => {
                  parents = await this._categoryTreeRepository.findAncestors(
                    category,
                  );
                }),
              );

              parents = parents.filter((parent) => parent.addInStatistics);

              parents.forEach((parent) =>
                parentsData.push({ id: parent.id, title: parent.title }),
              );

              const value = variant.salePrice * variantOutput.quantity;
              values.push(value);
            }),
          );

          const stockValue = values.reduce((sum, i) => sum + i, 0);

          parentsData.forEach((parent) => {
            let index = 0;
            categoriesData.forEach((categoty) => {
              if (parent.id === categoty.id) {
                indexes.push(index);
              }
              index++;
            });
          });

          indexes.forEach((index) => (purchases[index] += stockValue));
        }),
      );

      return new GetCategoriesResumeOutput(
        categoriesData,
        etats,
        defectueux,
        purchases,
        sales,
        inTransit,
        lang,
        storagePoint,
      );
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        `${GetCategoriesResumeService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetCategoriesResumeInput,
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
        `${GetCategoriesResumeService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _getItemParentCategories(
    productItem: ProductItem,
  ): Promise<CategoryData[]> {
    try {
      const parentsData: CategoryData[] = [];

      const product = await this._productRepository.findOne({
        where: { id: productItem.productVariant.productId },
        relations: ['categories'],
      });

      let parents: Category[] = [];

      await Promise.all(
        product.categories.map(async (category) => {
          parents = await this._categoryTreeRepository.findAncestors(category);
        }),
      );

      parents = parents.filter((parent) => parent.addInStatistics);

      parents.forEach((parent) =>
        parentsData.push({ id: parent.id, title: parent.title }),
      );

      return parentsData;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `${GetCategoriesResumeService.name} - ${this._getItemParentCategories.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private _initArray(categoriesData: CategoryData[]): number[] {
    const array: number[] = [];

    for (let i = 0; i < categoriesData.length; i++) {
      array[i] = 0;
    }

    return array;
  }
}
