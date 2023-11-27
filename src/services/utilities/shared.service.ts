import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  TString,
  ValueMap,
} from '@glosuite/shared';
import { MiniProductVariantOutput } from 'src/domain/dto/items';
import {
  CATALOG_SYNC_TIMEOUT,
  DEFAULT_CATEGORY_PATH,
  ORDERS_SYNC_TIMEOUT,
  SYNC_DEFAULT_MARGE,
} from 'src/domain/constants';
import { VariantNeeded, VariantTransfert } from 'src/domain/entities/flows';
import {
  Product,
  ProductItem,
  ProductVariant,
  ProductVariantAttributeValues,
  VariantComposition,
} from 'src/domain/entities/items';
import { Attribute, Unit } from 'src/domain/entities/items/eav';
import { ArticleOrdered } from 'src/domain/entities/orders';
import { Area, Location, StoragePoint } from 'src/domain/entities/warehouses';
import { StepStatus } from 'src/domain/enums/flows';
import { ItemState, QuantityProprety } from 'src/domain/enums/items';
import { TStringValueModel } from 'src/domain/interfaces';
import { VariantToPickModel } from 'src/domain/interfaces/flows';
import { ProductItemDetails } from 'src/domain/interfaces/items';
import { CrawlPagination, FilterGroups } from 'src/domain/interfaces/magento';
import { MagentoCategoryModel } from 'src/domain/interfaces/magento/i.magento-category.model';
import {
  LocationModel,
  StockValueMapModel,
} from 'src/domain/interfaces/warehouses';
import {
  ProductVariantItemDetails,
  VariantAttributeValueModel,
} from 'src/domain/types/catalog/items';
import {
  AttributeRepository,
  ProductItemRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import {
  AreaRepository,
  LocationRepository,
  LocationTreeRepository,
} from 'src/repositories/warehouses';
import { StockValueModel } from 'src/domain/interfaces/analytics';
import { VoucherItemOutput } from 'src/domain/dto/orders';
import { Category } from 'src/domain/entities/structures';
import { SynchronizationHistory } from 'src/domain/entities/magento';
import {
  CrawlResult,
  MagentoFilterConditionType,
} from 'src/domain/enums/magento';
import { KNOWN_CODES } from 'src/domain/constants/public.constants';
import { LocationService } from '../generals';

@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttributeValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(ProductItem)
    private readonly _productItemRepository: ProductItemRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
    @InjectRepository(Location)
    private readonly _locationTreeRepository: LocationTreeRepository,
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
  ) {}

  async buildVariantAttributeValuesModel(
    variantAttributeValues: ProductVariantAttributeValues<any>[],
  ): Promise<VariantAttributeValueModel<any>[]> {
    const variantAttributeValuesModel: VariantAttributeValueModel<any>[] = [];

    await Promise.all(
      variantAttributeValues.map(async (variantAttrValue) => {
        const variantAttributeValue =
          await this._productVariantAttributeValuesRepository.findOne({
            where: { id: variantAttrValue.id },
          });

        const attribute = await this._attributeRepository.findOne({
          where: { id: variantAttrValue.attributeId },
          relations: ['units', 'definedAttributeValues'],
        });

        let unit: Unit;
        if (
          variantAttrValue.unitId &&
          !isNullOrWhiteSpace(variantAttrValue.unitId)
        ) {
          unit = await this._unitRepository.findOne({
            where: { id: variantAttrValue.unitId },
          });

          if (!unit) {
            throw new NotFoundException(
              `Unit with id ${variantAttrValue.unitId} is not found`,
            );
          }
        } else {
          unit = attribute.units[0];
        }

        variantAttributeValuesModel.push({
          variantAttributeValue,
          attribute,
          value: variantAttrValue.value,
          unit,
        });
      }),
    );

    return variantAttributeValuesModel;
  }

  async generateSuffix(total: number, size: number): Promise<string> {
    const suffix = total.toString();
    return suffix.padStart(size, '0');
  }

  async buildPickingListOutput(
    pickingVariants: VariantNeeded[] | ArticleOrdered[] | VariantTransfert[],
  ): Promise<VariantToPickModel[]> {
    const variantsToPick: VariantToPickModel[] = [];

    await Promise.all(
      pickingVariants.map(async (pickingVariant) => {
        const variant = await this._productVariantRepository.findOne({
          where: { id: pickingVariant.variantId },
          relations: ['productItems', 'attributeValues', 'product'],
        });

        if (!variant) {
          throw new InternalServerErrorException(
            `An error occur. Please try again`,
          );
        }

        const variantDetails = await this.buildPartialVariantOutput(variant);

        const locations: Location[] = [];

        await Promise.all(
          variant.productItems.map(async (item) => {
            const productItem = await this._productItemRepository.findOne({
              where: { id: item.id },
              relations: ['location'],
            });

            if (!productItem) {
              throw new InternalServerErrorException(
                `An error occur. Please try again`,
              );
            }

            if (
              productItem.state === ItemState.AVAILABLE &&
              productItem.status === StepStatus.IN_STOCK
            ) {
              if (!locations.some((loc) => loc.id === productItem.locationId)) {
                locations.push(productItem.location);
              }
            }
          }),
        );

        const variantToPick: VariantToPickModel = {
          variant: variantDetails,
          quantityToPick:
            pickingVariant.quantity - pickingVariant.pickedQuantity,
          locations,
        };

        variantsToPick.push(variantToPick);
      }),
    );

    return variantsToPick;
  }

  async buildPickPackLocationsOutput(
    variant: ProductVariant,
  ): Promise<LocationModel[]> {
    try {
      const locationModels: LocationModel[] = [];
      const inStockLocations: Location[] = [];
      const toStoreLocations: Location[] = [];
      const allLocations: Location[] = [];

      await Promise.all(
        variant.productItems.map(async (item) => {
          const productItem = await this._productItemRepository.findOne({
            where: { id: item.id },
            relations: ['location'],
          });

          if (!productItem) {
            throw new InternalServerErrorException(
              `An error occur. Please try again`,
            );
          }

          if (
            productItem.state === ItemState.AVAILABLE &&
            productItem.status === StepStatus.IN_STOCK
          ) {
            inStockLocations.push(productItem.location);
            allLocations.push(productItem.location);
          }

          if (
            productItem.state === ItemState.AVAILABLE &&
            productItem.status === StepStatus.TO_STORE
          ) {
            toStoreLocations.push(productItem.location);
            allLocations.push(productItem.location);
          }
        }),
      );

      const locationsAdded: Location[] = [];

      await Promise.all(
        allLocations.map(async (location) => {
          const inStock = inStockLocations.filter(
            (loc) => loc.id === location.id,
          ).length;

          const toStore = toStoreLocations.filter(
            (loc) => loc.id === location.id,
          ).length;

          // Get the storage point
          const storagePoint = await this.getStoragePointByLocation(location);

          if (!locationsAdded.some((loc) => loc.id === location.id))
            locationModels.push({
              storagePoint,
              location,
              stock: { inStock, toStore },
            });

          locationsAdded.push(location);
        }),
      );

      return locationModels;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async buildVariantsOutput(
    variants: ProductVariant[],
    location?: Location,
  ): Promise<ProductVariantItemDetails[]> {
    const allVariantsOutput: ProductVariantItemDetails[] = [];

    await Promise.all(
      variants.map(async (variant) => {
        variant.product = await this._productRepository.findOne({
          where: { id: variant.productId },
          relations: ['categories'],
        });

        const variantDetails = await this.buildVariantDetailsOutput(
          variant,
          null,
          location,
        );

        allVariantsOutput.push(variantDetails);
      }),
    );

    return allVariantsOutput;
  }

  async buildMiniPartialVariantOutput(
    variant: ProductVariant,
  ): Promise<Partial<ProductVariantItemDetails>> {
    try {
      variant = await this._productVariantRepository.findOne({
        where: { id: variant.id },
        relations: ['product', 'productItems'],
      });

      variant.product = await this._productRepository.findOne({
        where: { id: variant.productId },
        relations: ['categories'],
      });

      const categoriesOutput = variant.product.categories;

      const productItemsDetails: ProductItemDetails[] = [];
      if (variant.productItems && variant.productItems.length > 0) {
        for (const productItem of variant.productItems) {
          const location = await this._locationRepository.findOne({
            where: { id: productItem.locationId },
          });
          const storagePoint = await this._getLocationStoragePoint(location);

          const itemDetails: ProductItemDetails = {
            productItem,
            storagePoint,
          };
          productItemsDetails.push(itemDetails);
        }
      }

      const variantDetails: Partial<ProductVariantItemDetails> = {
        id: variant.id,
        magentoId: variant.magentoId,
        magentoSKU: variant.magentoSKU,
        reference: variant.reference,
        title: variant.title,
        shortDescription: variant.shortDescription,
        description: variant.description,
        salePrice: variant.salePrice,
        specialPrice: variant.specialPrice,
        purchaseCost: variant.purchaseCost,
        quantity: variant.quantity,
        sku: variant.sku,
        thumbnail: variant.thumbnail,
        productType: variant.product.productType,
        categories: categoriesOutput,
        productId: variant.productId,
        productItems: productItemsDetails,
        createdAt: variant.createdAt,
        lastUpdate: variant.lastUpdate,
      };

      return variantDetails;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async buildPartialVariantOutput(
    variant: ProductVariant,
  ): Promise<Partial<ProductVariantItemDetails>> {
    try {
      variant = await this._productVariantRepository.findOne({
        where: { id: variant.id },
        relations: ['product', 'attributeValues', 'children'],
      });

      const variantChildren = await this.buildVariantChildrenModel(
        variant.children,
      );

      variant.product = await this._productRepository.findOne({
        where: { id: variant.productId },
        relations: ['categories'],
      });

      const categoriesOutput = variant.product.categories;

      const variantDetails: Partial<ProductVariantItemDetails> = {
        id: variant.id,
        magentoId: variant.magentoId,
        magentoSKU: variant.magentoSKU,
        reference: variant.reference,
        title: variant.title,
        name: getLangOrFirstAvailableValue(variant.title, ISOLang.FR),
        shortDescription: variant.shortDescription,
        description: variant.description,
        salePrice: variant.salePrice,
        specialPrice: variant.specialPrice,
        purchaseCost: variant.purchaseCost,
        quantity: variant.quantity,
        sku: variant.sku,
        thumbnail: variant.thumbnail,
        productType: variant.product.productType,
        productId: variant.productId,
        categories: categoriesOutput,
        attributeValues:
          variant.attributeValues?.length > 0
            ? await this.buildVariantAttributeValuesModel(
                variant.attributeValues,
              )
            : [],
        children:
          variant.children?.length > 0
            ? variantChildren.map(
                (child) => new MiniProductVariantOutput(child, ISOLang.FR),
              )
            : [],
      };

      return variantDetails;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async buildVariantChildrenModel(
    children: VariantComposition[],
  ): Promise<Partial<ProductVariantItemDetails>[]> {
    try {
      const variantChildren: Partial<ProductVariantItemDetails>[] = [];

      await Promise.all(
        children.map(async (composition) => {
          const childItem = await this._productVariantRepository.findOne({
            where: { id: composition.childId },
            relations: ['attributeValues'],
          });

          const childDetails = await this.buildPartialVariantOutput(childItem);

          variantChildren.push(childDetails);
        }),
      );

      return variantChildren;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async buildVariantDetailsOutput(
    variant: ProductVariant,
    categories?: Category[],
    location?: Location,
  ): Promise<ProductVariantItemDetails> {
    try {
      const productVariant = await this._productVariantRepository.findOne({
        where: { id: variant.id },
        relations: [
          'product',
          'attributeValues',
          'productItems',
          'children',
          'specialPrice',
        ],
      });

      productVariant.product = await this._productRepository.findOne({
        where: { id: productVariant.productId },
        relations: ['categories'],
      });

      const categoriesOutput =
        categories && categories.length > 0
          ? categories
          : productVariant.product.categories;

      const productItemsDetails: ProductItemDetails[] = [];
      // let stockValue: StockValueModel = DEFAULT_STOCK_VALUE_QUANTITY;
      const stockValueMap: StockValueMapModel = {
        available: [],
        discovered: [],
        reserved: [],
        inTransit: [],
        deliveryProcessing: [],
        awaitingSAV: [],
        delivered: [],
        gotOut: [],
        pendingInvestigation: [],
        lost: [],
        isDead: [],
        pendingReception: [],
      };

      let productItems: ProductItem[] = [];

      productItems = !!location
        ? productVariant.productItems.filter(
            (productItem) =>
              !isNullOrWhiteSpace(productItem.locationId) &&
              productItem.locationId === location.id,
          )
        : productVariant.productItems;

      await Promise.all(
        productItems?.map(async (productItem) => {
          if (!isNullOrWhiteSpace(productItem.locationId)) {
            productItem.location = await this._locationRepository.findOne({
              where: { id: productItem.locationId },
            });

            const parents = await this._locationTreeRepository.findAncestors(
              productItem.location,
            );
            const parentLocation = parents.find(
              (parent) => !isNullOrWhiteSpace(parent.areaId),
            );

            const area = await this._areaRepository.findOne({
              where: { id: parentLocation.areaId },
              relations: ['storagePoint'],
            });

            const storagePoint = area.storagePoint;

            // stockValue
            switch (productItem.state) {
              case ItemState.AVAILABLE:
                stockValueMap.available.push(productItem.purchaseCost);
                break;

              case ItemState.DISCOVERED:
                stockValueMap.discovered.push(productItem.purchaseCost);
                break;

              case ItemState.RESERVED:
                stockValueMap.reserved.push(productItem.purchaseCost);
                break;

              case ItemState.IN_TRANSIT:
                stockValueMap.inTransit.push(productItem.purchaseCost);
                break;

              case ItemState.DELIVERY_PROCESSING:
                stockValueMap.deliveryProcessing.push(productItem.purchaseCost);
                break;

              case ItemState.AWAITING_SAV:
                stockValueMap.awaitingSAV.push(productItem.purchaseCost);
                break;

              case ItemState.DELIVERED:
                stockValueMap.delivered.push(productItem.purchaseCost);
                break;

              case ItemState.GOT_OUT:
                stockValueMap.gotOut.push(productItem.purchaseCost);
                break;

              case ItemState.PENDING_INVESTIGATION:
                stockValueMap.pendingInvestigation.push(
                  productItem.purchaseCost,
                );
                break;

              case ItemState.LOST:
                stockValueMap.lost.push(productItem.purchaseCost);
                break;

              case ItemState.IS_DEAD:
                stockValueMap.isDead.push(productItem.purchaseCost);
                break;

              case ItemState.PENDING_RECEPTION:
                stockValueMap.pendingReception.push(productItem.purchaseCost);
                break;

              default:
                break;
            }

            productItemsDetails.push({ productItem, storagePoint });
          } else {
            productItemsDetails.push({ productItem });
          }
        }),
      );

      const variantChildren = await this.buildVariantChildrenModel(
        productVariant.children,
      );

      // Calculate stock value
      const stockValue: StockValueModel = {
        available: stockValueMap.available.reduce(
          (sum, current) => sum + current,
          0,
        ),
        discovered: stockValueMap.discovered.reduce(
          (sum, current) => sum + current,
          0,
        ),
        reserved: stockValueMap.reserved.reduce(
          (sum, current) => sum + current,
          0,
        ),
        inTransit: stockValueMap.inTransit.reduce(
          (sum, current) => sum + current,
          0,
        ),
        deliveryProcessing: stockValueMap.deliveryProcessing.reduce(
          (sum, current) => sum + current,
          0,
        ),
        awaitingSAV: stockValueMap.awaitingSAV.reduce(
          (sum, current) => sum + current,
          0,
        ),
        delivered: stockValueMap.delivered.reduce(
          (sum, current) => sum + current,
          0,
        ),
        gotOut: stockValueMap.gotOut.reduce((sum, current) => sum + current, 0),
        pendingInvestigation: stockValueMap.pendingInvestigation.reduce(
          (sum, current) => sum + current,
          0,
        ),
        lost: stockValueMap.lost.reduce((sum, current) => sum + current, 0),
        isDead: stockValueMap.isDead.reduce((sum, current) => sum + current, 0),
        pendingReception: stockValueMap.pendingReception.reduce(
          (sum, current) => sum + current,
          0,
        ),
      };

      const variantItemOutput: ProductVariantItemDetails = {
        id: productVariant.id,
        magentoId: variant.magentoId,
        magentoSKU: variant.magentoSKU,
        reference: productVariant.reference,
        title: productVariant.product.title,
        shortDescription: productVariant.shortDescription,
        description: productVariant.description,
        shippingClass: productVariant.shippingClass,
        sku: productVariant.sku,
        thumbnail: productVariant.thumbnail,
        gallery: productVariant.gallery,
        productType: productVariant.product.productType,
        productId: productVariant.productId,
        attributeValues:
          productVariant.attributeValues?.length > 0
            ? await this.buildVariantAttributeValuesModel(
                productVariant.attributeValues,
              )
            : [],
        children:
          productVariant.children?.length > 0
            ? variantChildren.map(
                (child) => new MiniProductVariantOutput(child, ISOLang.FR),
              )
            : [],
        productItems: productItemsDetails,
        categories: categoriesOutput,
        quantity: productVariant.quantity,
        salePrice: productVariant.salePrice,
        specialPrice: productVariant.specialPrice
          ? new VoucherItemOutput(productVariant.specialPrice)
          : null,
        purchaseCost: productVariant.purchaseCost,
        stockValue: stockValue,
        rentPrice: productVariant.rentPrie,
        canBeSold: productVariant.product.canBeSold,
        canBeRented: productVariant.product.canBeRented,
        canBePackaged: productVariant.product.canBePackaged,
        mustBePackaged: productVariant.product.mustBePackaged,
        createdBy: productVariant.createdBy,
        createdAt: productVariant.createdAt,
        lastUpdate: productVariant.lastUpdate,
      };

      return variantItemOutput;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  getQuantityProperty(state: ItemState): QuantityProprety {
    switch (state) {
      case ItemState.AVAILABLE:
        return QuantityProprety.AVAILABLE;

      case ItemState.DISCOVERED:
        return QuantityProprety.DISCOVERED;

      case ItemState.RESERVED:
        return QuantityProprety.RESERVED;

      case ItemState.IN_TRANSIT:
        return QuantityProprety.IN_TRANSIT;

      case ItemState.DELIVERY_PROCESSING:
        return QuantityProprety.DELIVERY_PROCESSING;

      case ItemState.AWAITING_SAV:
        return QuantityProprety.AWAITING_SAV;

      case ItemState.DELIVERED:
        return QuantityProprety.DELIVERED;

      case ItemState.GOT_OUT:
        return QuantityProprety.GOT_OUT;

      case ItemState.PENDING_INVESTIGATION:
        return QuantityProprety.PENDING_INVESTIGATION;

      case ItemState.LOST:
        return QuantityProprety.LOST;

      case ItemState.IS_DEAD:
        return QuantityProprety.IS_DEAD;

      case ItemState.PENDING_RECEPTION:
        return QuantityProprety.PENDING_RECEPTION;
    }
  }

  private _calculateStockValue(
    stockValue: StockValueModel,
    productItem: ProductItem,
  ): StockValueModel {
    switch (productItem.state) {
      case ItemState.AVAILABLE:
        stockValue.available += productItem.purchaseCost;
        break;

      case ItemState.RESERVED:
        stockValue.reserved += productItem.purchaseCost;
        break;

      case ItemState.IN_TRANSIT:
        stockValue.inTransit += productItem.purchaseCost;
        break;

      case ItemState.DELIVERY_PROCESSING:
        stockValue.deliveryProcessing += productItem.purchaseCost;
        break;

      case ItemState.AWAITING_SAV:
        stockValue.awaitingSAV += productItem.purchaseCost;
        break;

      case ItemState.PENDING_INVESTIGATION:
        stockValue.pendingInvestigation += productItem.purchaseCost;
        break;

      case ItemState.LOST:
        stockValue.lost += productItem.purchaseCost;
        break;

      case ItemState.IS_DEAD:
        stockValue.isDead += productItem.purchaseCost;
        break;

      default:
        break;
    }

    return stockValue;
  }

  async buildCollectionArticlesOutput(
    variants: ProductVariant[],
  ): Promise<Partial<ProductVariantItemDetails>[]> {
    try {
      const articles: Partial<ProductVariantItemDetails>[] = [];

      if (variants && variants.length > 0) {
        await Promise.all(
          variants?.map(async (variant) => {
            variant = await this._productVariantRepository.findOne({
              where: { id: variant.id },
              relations: ['product', 'attributeValues', 'productItems'],
            });

            const variantDetails = await this.buildPartialVariantOutput(
              variant,
            );

            articles.push(variantDetails);
          }),
        );
      }

      return articles;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }

  async randomNumber(length: number): Promise<number> {
    return Math.floor(
      Math.pow(10, length - 1) +
        Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1),
    );
  }

  buildTStringValue(value: string, lang: ISOLang, oldValue?: TString): TString {
    const output: TString = oldValue ? oldValue : { fr: '', en: '' };
    const inputs: TStringValueModel[] = [{ value, lang }];

    for (const input of inputs) {
      const { value, lang } = input;

      output[lang] = value;
    }

    return output;
  }

  buildValueMapValue(value?: string, code?: string, lang?: ISOLang): ValueMap {
    const valueMap: ValueMap = {
      name: value,
    };
    if (code) {
      valueMap.code = code;
      const knownCode = KNOWN_CODES.find((item) => item.code === code);
      if (knownCode) {
        valueMap.name = lang ? knownCode.name[lang] : knownCode.name.fr;
      }
    }
    return valueMap;
  }

  capitalizeFirstLetter(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  leftTrim(str: string): string {
    if (!str) return str;
    return str.replace(/^\s+/g, '');
  }

  isStringContainsLetter(str: string): boolean {
    const regExp = /[a-zA-Z]/g;
    return regExp.test(str);
  }

  buildURL(
    request: string,
    pagination?: CrawlPagination,
    pathParam?: number | string,
    filterGroups?: FilterGroups[],
  ): string {
    let path: string = request;

    if (pagination) {
      path += `?searchCriteria[pageSize]=${pagination.pageSize}&searchCriteria[currentPage]=${pagination.currentPage}`;
    }

    if (pathParam) {
      path += `/${pathParam}`;
    }

    if (filterGroups && filterGroups.length > 0) {
      let i = 0;
      filterGroups.forEach((group) => {
        path += `&searchCriteria[filter_groups][${i}][filters][0][field]=${group.field}`;
        path += `&searchCriteria[filter_groups][${i}][filters][0][value]=${group.value}`;
        path += `&searchCriteria[filter_groups][${i}][filters][0][conditionType]=${group.conditionType}`;

        i++;
      });
    }

    return path;
  }

  buildMagentoOrderSyncURLCriteria(syncHistory: SynchronizationHistory): {
    pagination: CrawlPagination;
    filters: FilterGroups[];
  } {
    const now = new Date();
    // const date = this.addHoursToDate(now, 1);

    let pageSize = parseInt(process.env.ORDERS_SYNC_PAGE_SIZE);
    const currentPage = parseInt(process.env.ORDERS_SYNC_CURRENT_PAGE);
    const timeout =
      (parseInt(process.env.ORDERS_SYNC_TIMEOUT) +
        parseInt(process.env.SYNC_DEFAULT_MARGE)) /
      60;
    const filter: FilterGroups = {
      field: 'created_at',
      value: this.removeMinutesToDate(now, timeout).toISOString(),
      conditionType: MagentoFilterConditionType.GREATER_OR_EQUAL_VALUE,
    };

    if (syncHistory && syncHistory.lastStatus === CrawlResult.FAILURE) {
      pageSize = (1 + syncHistory.times) * pageSize;
      const minutes = (1 + syncHistory.times) * timeout;
      filter.value = this.removeMinutesToDate(now, minutes).toISOString();
    }

    const pagination: CrawlPagination = { pageSize, currentPage };

    return {
      pagination,
      filters: [filter],
    };
  }

  buildMagentoCataloSyncgURLCriteria(syncHistory: SynchronizationHistory): {
    pagination: CrawlPagination;
    filters: FilterGroups[];
  } {
    const now = new Date();
    // const date = this.addHoursToDate(now, 1);

    let pageSize = parseInt(process.env.CATALOG_SYNC_PAGE_SIZE);
    const currentPage = parseInt(process.env.CATALOG_SYNC_CURRENT_PAGE);
    const timeout =
      (parseInt(process.env.CATALOG_SYNC_TIMEOUT) +
        parseInt(process.env.SYNC_DEFAULT_MARGE)) /
      60;
    const filter: FilterGroups = {
      field: 'updated_at',
      value: this.removeMinutesToDate(now, timeout).toISOString(),
      conditionType: MagentoFilterConditionType.GREATER_OR_EQUAL_VALUE,
    };

    if (syncHistory && syncHistory.lastStatus === CrawlResult.FAILURE) {
      pageSize = (1 + syncHistory.times) * pageSize;
      const minutes = (1 + syncHistory.times) * timeout;
      filter.value = this.removeMinutesToDate(now, minutes).toISOString();
    }

    const pagination: CrawlPagination = { pageSize, currentPage };

    return {
      pagination,
      filters: [filter],
    };
  }

  isActiveCategory(magentoCategory: MagentoCategoryModel): boolean {
    if (magentoCategory.path.slice(0, 4) === DEFAULT_CATEGORY_PATH) {
      // if (magentoCategory.level <= 4) {
      //   if (magentoCategory.include_in_menu && magentoCategory.is_active) {
      //     return true;
      //   }
      // } else {
      //   return true;
      // }
      return true;
    }

    return false;
  }

  buildSearchExpression(keywords: string[]): [string, string] {
    let firstEx = '';
    let secondEx = '';
    let i = 0;
    let j = 0;

    keywords.map((keyword) => {
      if (i === 0) {
        firstEx += `%${keyword}%`;
      } else if (i === keywords.length - 1) {
        firstEx += `${keyword}%`;
      } else {
        firstEx += `${keyword}`;
      }
      i++;
    });

    keywords.reverse();

    keywords.map((keyword) => {
      if (j === 0) {
        secondEx += `%${keyword}%`;
      } else if (j === keywords.length - 1) {
        secondEx += `${keyword}%`;
      } else {
        secondEx += `${keyword}`;
      }
      j++;
    });

    return [firstEx, secondEx];
  }

  async getStoragePointByLocation(location: Location): Promise<StoragePoint> {
    const ancestors = await this._locationTreeRepository.findAncestors(
      location,
    );

    const parentLocation = ancestors.find(
      (loc) => !isNullOrWhiteSpace(loc.areaId),
    );

    const area = await this._areaRepository.findOne({
      where: { id: parentLocation.areaId },
      relations: ['storagePoint'],
    });

    return area.storagePoint;
  }

  addDaysToDate(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  addHoursToDate(date: Date, hours: number): Date {
    const newDate = new Date(date);
    newDate.setTime(newDate.getTime() + hours * 60 * 60000);
    return newDate;
  }

  removeMinutesToDate(date: Date, minutes: number): Date {
    const newDate = new Date(date);
    newDate.setTime(newDate.getTime() - minutes * 60000);
    return newDate;
  }

  toLowerCaseAndNormalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private async _getLocationStoragePoint(
    location: Location,
  ): Promise<StoragePoint> {
    try {
      const parents = await this._locationTreeRepository.findAncestors(
        location,
      );

      const ancestor = parents.find((parent) => !!parent.areaId);

      const area = await this._areaRepository.findOne({
        where: { id: ancestor.areaId },
        relations: ['storagePoint'],
      });

      return area.storagePoint;
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }
}
