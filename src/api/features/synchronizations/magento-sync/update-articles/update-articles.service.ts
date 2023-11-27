import {
  DiscountType,
  ISOLang,
  Image,
  MediaGallery,
  MediaType,
  getLangOrFirstAvailableValue,
} from '@glosuite/shared';
import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CRAWL_DEFAULT_CURRENT_PAGE_FOR_ARTICLES,
  CRAWL_DEFAULT_PAGE_SIZE_FOR_ARTICLES,
  GET_PRODUCTS,
  MAGENTO_BASE_API_URL,
  MAGENTO_PRODUCT_DESCRIPTION_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_IMAGE_BASE_URL,
  MAGENTO_PRODUCT_SHORT_DESCRIPTION_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_END_DATE_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_START_DATE_ATTRIBUTE_CODE,
  MAGENTO_THUMBNAIL_ATTRIBUTE_CODE,
  MAGENTO_USER_TOKEN,
  MEDIA_TYPE_MAPPING,
} from 'src/domain/constants';
import { ImportArticlesOutput } from 'src/domain/dto/magento';
import {
  Product,
  ProductComposition,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import { Unit } from 'src/domain/entities/items/eav';
import { CrawlActivity } from 'src/domain/entities/magento';
import { Voucher } from 'src/domain/entities/orders';
import { CrawlResult, CrawlType } from 'src/domain/enums/magento';
import {
  FilterGroups,
  MagentoArticleModel,
  MediaGalleryEntry,
  SendHttpRequestResult,
} from 'src/domain/interfaces/magento';
import {
  ProductCompositionRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import { CrawlActivityRepository } from 'src/repositories/magento';
import { VoucherRepository } from 'src/repositories/orders';
import { CrawlArticlesService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';

type ValidationResult = {
  pageSize: number;
  currentPage: number;
  lastUpdate: Date;
};

@Injectable()
export class UpdateArticlesService {
  constructor(
    @InjectRepository(CrawlActivity)
    private readonly _crawlActivityRepository: CrawlActivityRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttributeValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _crawlArticleService: CrawlArticlesService,
  ) {}

  async updateArticles(): Promise<ImportArticlesOutput> {
    const validationResult = await this._tryValidation();

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

    console.log('Import completed successfully');

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<ImportArticlesOutput> {
    try {
      // eslint-disable-next-line prefer-const
      let { pageSize, currentPage, lastUpdate } = result;

      const allProductsEdited: Product[] = [];
      const allVariantsEdited: ProductVariant[] = [];
      const allUnitsEdited: Unit[] = [];
      let progressCount = 0;
      let totalCount = 0;

      do {
        const filterGroups: FilterGroups[] = [];

        // if (lastUpdate) {
        //   filterGroups.push({
        //     field: 'updated_at',
        //     value: lastUpdate.toISOString(),
        //     conditionType: 'gteq',
        //   });
        // }

        const result = await this._sendHttpRequest(
          pageSize,
          currentPage,
          null,
          filterGroups,
          lastUpdate,
        );

        pageSize = result.pageSize;
        currentPage = result.currentPage;
        lastUpdate = result.lastUpdate;
        const currentCount = result.currentCount;
        totalCount = result.totalCount;
        progressCount += currentCount;

        const symbols: string[] = [];
        const unitsFromDB = await this._unitRepository.find();
        unitsFromDB.map((unit) => symbols.push(unit.symbol));

        /**
         * Build productNames, simpleProducts,
         * bundledProducts and groupedProducts
         */
        const productNames: string[] = [];
        const productSKUs: string[] = [];
        const simpleProducts: MagentoArticleModel[] = [];
        const bundleProducts: MagentoArticleModel[] = [];
        const groupedProducts: MagentoArticleModel[] = [];

        result.magentoArticles.map((article) => {
          productNames.push(article.name);
          productSKUs.push(article.sku);

          if (article.type_id === 'simple' || article.type_id === 'virtual') {
            simpleProducts.push(article);
          }

          if (article.type_id === 'bundle') {
            bundleProducts.push(article);
          }

          if (article.type_id === 'groupe') {
            groupedProducts.push(article);
          }
        });

        console.log(`Simple : ${simpleProducts.length}`);
        console.log(`Bundle : ${bundleProducts.length}`);
        console.log(`Groupe : ${groupedProducts.length}\n\n\n`);

        /**
         * Build ProductNamesPatterns[]
         */
        const productNamesPatterns =
          await this._crawlArticleService.buildProductNamesPatterns(
            productNames,
            symbols,
          );

        const productsEdited: Product[] = [];
        const variantsEdited: ProductVariant[] = [];
        const unitsEdited: Unit[] = [];

        console.log(
          `START UPDATING SIMPLE PRODUCTS TREATMENT.................`,
        );

        for (const simpleProduct of simpleProducts) {
          const productSKU = await this._crawlArticleService.getProductSKU(
            simpleProduct.sku,
            symbols,
          );

          const product = await this._productRepository.findOne({
            where: { sku: productSKU },
          });

          if (product) {
            console.log(
              `Update product ${product.reference} - ${
                product.sku
              } : ${getLangOrFirstAvailableValue(product.title, ISOLang.FR)}`,
            );

            const productTitle =
              await this._crawlArticleService.getProductFromMagentoName(
                simpleProduct.name,
                productNamesPatterns,
                symbols,
              );

            const { productCategories, productCollections } =
              await this._crawlArticleService.getProductCategoriesAndCollections(
                simpleProduct.extension_attributes.category_links,
              );

            product.title = this._sharedService.buildTStringValue(
              productTitle,
              ISOLang.FR,
            );
            product.categories = productCategories;

            await this._productRepository.save(product);

            productsEdited.push(product);

            const productVariant = await this._productVariantRepository.findOne(
              {
                where: { magentoId: simpleProduct.id },
                relations: ['specialPrice'],
              },
            );

            if (productVariant) {
              console.log(
                `Update variant ${productVariant.reference} - ${
                  productVariant.sku
                } : ${getLangOrFirstAvailableValue(
                  productVariant.title,
                  ISOLang.FR,
                )}`,
              );

              const magentoThumbnail =
                this._crawlArticleService.getVariantThumbnailURL(
                  simpleProduct.media_gallery_entries,
                  simpleProduct.custom_attributes,
                );

              const variantThumbnail: Image = {
                type: MediaType.IMAGE,
                src: MAGENTO_PRODUCT_IMAGE_BASE_URL + magentoThumbnail.file,
                alt: this._sharedService.buildTStringValue(
                  magentoThumbnail.label,
                  ISOLang.FR,
                ),
              };

              const magentoProductGallery: MediaGalleryEntry[] = [];

              simpleProduct.media_gallery_entries.map((media) => {
                const { media_type, label, disabled, types, file, ...data } =
                  media;

                if (
                  !types.find(
                    (type) => type === MAGENTO_THUMBNAIL_ATTRIBUTE_CODE,
                  ) &&
                  !disabled
                ) {
                  magentoProductGallery.push({
                    media_type,
                    label,
                    disabled,
                    types,
                    file,
                  });
                }
              });

              const variantGallery: MediaGallery[] = [];
              magentoProductGallery.map((gallery) => {
                const mediaType = MEDIA_TYPE_MAPPING.find(
                  (mediaType) => mediaType.input === gallery.media_type,
                );

                variantGallery.push({
                  type: mediaType ? mediaType.output : null,
                  src: MAGENTO_PRODUCT_IMAGE_BASE_URL + gallery.file,
                  alt: this._sharedService.buildTStringValue(
                    gallery.label,
                    ISOLang.FR,
                  ),
                });
              });

              /**
               * 2.2 Build variant attribute values
               */
              console.log(
                `Update variant ${productVariant.sku} attributeValues.....`,
              );

              const [attributeValuesData, unitsAdded] =
                await this._crawlArticleService.getVariantAttributeValues(
                  simpleProduct.custom_attributes,
                  unitsEdited,
                );

              unitsEdited.push(...unitsAdded);

              /**
               * 2.3 Get shortDescription, description, specialPrice, startDate, endDate
               */
              const shortDescriptionAttr = simpleProduct.custom_attributes.find(
                (customeAttr) =>
                  customeAttr.attribute_code ===
                  MAGENTO_PRODUCT_SHORT_DESCRIPTION_ATTRIBUTE_CODE,
              );

              const shortDescription = !!shortDescriptionAttr
                ? shortDescriptionAttr.value
                : null;

              const descriptionAttr = simpleProduct.custom_attributes.find(
                (customeAttr) =>
                  customeAttr.attribute_code ===
                  MAGENTO_PRODUCT_DESCRIPTION_ATTRIBUTE_CODE,
              );

              const description = !!descriptionAttr
                ? descriptionAttr.value
                : null;

              const specialPriceAttr = simpleProduct.custom_attributes.find(
                (customeAttr) =>
                  customeAttr.attribute_code ===
                  MAGENTO_PRODUCT_SPECIAL_PRICE_ATTRIBUTE_CODE,
              );

              const specialPrice = !!specialPriceAttr
                ? Number(specialPriceAttr.value)
                : null;

              // const priceAttr = simpleProduct.custom_attributes.find(
              //   (customAttr) =>
              //     customAttr.attribute_code ===
              //     MAGENTO_PRODUCT_PRICE_ATTRIBUTE_CODE,
              // );

              // const price = !!priceAttr ? Number(priceAttr.value) : 0;

              const startDateAttr = simpleProduct.custom_attributes.find(
                (customAttr) =>
                  customAttr.attribute_code ===
                  MAGENTO_PRODUCT_SPECIAL_PRICE_START_DATE_ATTRIBUTE_CODE,
              );

              const startDate = !!startDateAttr
                ? new Date(startDateAttr.value)
                : null;

              const endDateAttr = simpleProduct.custom_attributes.find(
                (customAttr) =>
                  customAttr.attribute_code ===
                  MAGENTO_PRODUCT_SPECIAL_PRICE_END_DATE_ATTRIBUTE_CODE,
              );

              const endDate = !!endDateAttr
                ? new Date(endDateAttr.value)
                : null;

              productVariant.shippingClass =
                await this._crawlArticleService.getVariantShippingClass(
                  simpleProduct.custom_attributes,
                );
              productVariant.title = product.title;
              productVariant.shortDescription =
                this._sharedService.buildTStringValue(
                  shortDescription,
                  ISOLang.FR,
                );
              productVariant.description =
                this._sharedService.buildTStringValue(description, ISOLang.FR);
              productVariant.salePrice = simpleProduct.price;
              productVariant.collections = productCollections;

              if (!!variantThumbnail) {
                productVariant.thumbnail = variantThumbnail;
              }

              if (!!variantGallery) {
                productVariant.gallery = variantGallery;
              }

              /**
               * If specialPrice, create a voucher and link to product variant
               */
              if (!!specialPrice && !productVariant.specialPrice) {
                const voucher = new Voucher();

                voucher.type = DiscountType.FIXED;
                voucher.value = specialPrice;
                voucher.startDate = startDate;
                voucher.endDate = endDate;

                await this._voucherRepository.save(voucher);

                productVariant.voucherId = voucher.id;
                productVariant.specialPrice = voucher;
              } else if (!!specialPrice && productVariant.specialPrice) {
                const voucher = await this._voucherRepository.findOne({
                  where: { id: productVariant.voucherId },
                });

                voucher.value = specialPrice;
                voucher.startDate = startDate;
                voucher.endDate = endDate;

                await this._voucherRepository.save(voucher);
              }

              /**
               * Create and save variant attribute values
               */
              const attributeValuesToEdit: ProductVariantAttributeValues<any>[] =
                [];
              const attributeValuesToAdd: ProductVariantAttributeValues<any>[] =
                [];

              await Promise.all(
                attributeValuesData.map(async (attrValue) => {
                  const variantAttrValue =
                    await this._productVariantAttributeValuesRepository.findOne(
                      {
                        where: {
                          attributeId: attrValue.attribute.id,
                          variantId: productVariant.id,
                        },
                      },
                    );

                  if (variantAttrValue) {
                    variantAttrValue.value = attrValue.value;

                    attributeValuesToEdit.push(variantAttrValue);
                  } else {
                    const productVariantAttrValue =
                      new ProductVariantAttributeValues<any>();

                    productVariantAttrValue.value = attrValue.value;
                    productVariantAttrValue.attributeId =
                      attrValue.attribute.id;
                    productVariantAttrValue.attribute = attrValue.attribute;
                    productVariantAttrValue.variantId = productVariant.id;
                    productVariantAttrValue.productVariant = productVariant;

                    if (attrValue.unit) {
                      productVariantAttrValue.unit = attrValue.unit;
                      productVariantAttrValue.unitId = attrValue.unit.id;
                    }

                    attributeValuesToAdd.push(productVariantAttrValue);
                  }
                }),
              );

              await this._productVariantAttributeValuesRepository.save(
                attributeValuesToEdit,
              );

              await this._productVariantAttributeValuesRepository.save(
                attributeValuesToAdd,
              );

              await this._productVariantRepository.save(productVariant);
            }
          }
        }

        console.log(
          'START UPDATING BUNDLE PRODUCTS TREATMENT..................',
        );

        for (const bundleProduct of bundleProducts) {
          /**
           * 1.1  Get product Name
           */
          const productName =
            await this._crawlArticleService.getProductFromMagentoName(
              bundleProduct.name,
              productNamesPatterns,
              symbols,
            );

          /**
           * 1.2  Get product SKU
           */
          const productSKU = await this._crawlArticleService.getProductSKU(
            bundleProduct.sku,
            symbols,
          );

          /**
           * Check if the product already exists
           */
          const product = await this._productRepository.findOne({
            where: { sku: productSKU },
            relations: ['children'],
          });

          const { bundle_product_options, category_links } =
            bundleProduct.extension_attributes;

          if (product) {
            /**
             * 1.3 Get product categories and collections
             */
            console.log(
              `Update bundle ${product.reference} - ${
                product.sku
              } : ${getLangOrFirstAvailableValue(product.title, ISOLang.FR)}`,
            );

            const { productCategories, productCollections } =
              await this._crawlArticleService.getProductCategoriesAndCollections(
                category_links,
              );

            product.title = this._sharedService.buildTStringValue(
              productName,
              ISOLang.FR,
            );
            product.categories = productCategories;

            await this._productRepository.save(product);

            productsEdited.push(product);

            if (bundle_product_options && bundle_product_options.length > 0) {
              console.log(
                `Update bundle ${product.sku} children................`,
              );

              const productCompositonsToAdd: ProductComposition[] = [];
              const productCompositonsToEdit: ProductComposition[] = [];
              let position = 0;

              for (const productLink of bundle_product_options[0]
                .product_links) {
                const { id, sku, qty, is_default, price, can_change_quantity } =
                  productLink;

                const childSKU = await this._crawlArticleService.getProductSKU(
                  sku,
                  symbols,
                );
                const child = await this._productRepository.findOne({
                  where: { sku: childSKU },
                });

                if (child) {
                  console.log(
                    `Update child ${child.reference} - ${
                      child.sku
                    } : ${getLangOrFirstAvailableValue(
                      child.title,
                      ISOLang.FR,
                    )}`,
                  );

                  const productComposition =
                    await this._productCompositionRepository.findOne({
                      where: { childId: child.id, parentId: product.id },
                    });

                  if (
                    productComposition &&
                    (productComposition.required !== is_default ||
                      productComposition.defaultQuantity !== qty)
                  ) {
                    productComposition.required = is_default;
                    productComposition.defaultQuantity = qty;

                    productCompositonsToEdit.push(productComposition);
                  } else {
                    const productComposition = new ProductComposition();

                    position = product.children.length;

                    productComposition.child = child;
                    productComposition.childId = child.id;
                    productComposition.required = is_default;
                    productComposition.defaultQuantity = qty;
                    productComposition.parentId = product.id;
                    productComposition.parent = product;
                    productComposition.position = position;

                    productCompositonsToAdd.push(productComposition);

                    position++;
                  }
                }
              }

              if (productCompositonsToEdit.length > 0) {
                await this._productCompositionRepository.save(
                  productCompositonsToEdit,
                );
              }

              if (productCompositonsToAdd.length > 0) {
                await this._productCompositionRepository.save(
                  productCompositonsToAdd,
                );
                product.children.push(...productCompositonsToAdd);
              }

              await this._productRepository.save(product);
            }
          }
        }

        const crawlActivity = new CrawlActivity();

        crawlActivity.action = CrawlType.UPDATED_CRAWL;
        crawlActivity.entity = ProductVariant.name;
        crawlActivity.pageSize = pageSize;
        crawlActivity.currentPage = currentPage;
        crawlActivity.totalCount = variantsEdited.length;
        crawlActivity.result = CrawlResult.SUCCESS;

        await this._crawlActivityRepository.save(crawlActivity);

        console.log('** Current products updated = ', productsEdited.length);
        console.log('** Current variants updated = ', variantsEdited.length);
        console.log('** Current units updated = ', unitsEdited.length);

        allProductsEdited.push(...productsEdited);
        allVariantsEdited.push(...variantsEdited);
        allUnitsEdited.push(...unitsEdited);
      } while (progressCount < totalCount);

      console.log('****** PRODUCTS UPDATED = ', allProductsEdited.length);
      console.log('****** VARIANTS UPDATED = ', allVariantsEdited.length);
      console.log('****** UNITS ADDED = ', allUnitsEdited.length);

      return new ImportArticlesOutput(
        allProductsEdited.length,
        allVariantsEdited.length,
        allUnitsEdited.length,
      );
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${UpdateArticlesService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(): Promise<ValidationResult> {
    try {
      let pageSize: number = CRAWL_DEFAULT_PAGE_SIZE_FOR_ARTICLES;
      let currentPage: number = CRAWL_DEFAULT_CURRENT_PAGE_FOR_ARTICLES;
      let lastUpdate: Date;

      let crawls = await this._crawlActivityRepository.find({
        where: {
          action: CrawlType.UPDATED_CRAWL,
          entity: ProductVariant.name,
        },
        order: { createdAt: 'DESC' },
      });

      crawls = crawls.filter((crawl) => crawl.result === CrawlResult.SUCCESS);

      if (crawls && crawls.length > 0) {
        pageSize = crawls[0].pageSize;
        currentPage = crawls[0].currentPage;
        lastUpdate = crawls[0].lastUpdate;
      }

      console.log(pageSize, currentPage, lastUpdate);

      return { pageSize, currentPage, lastUpdate };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `${UpdateArticlesService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _sendHttpRequest(
    pageSize: number,
    currentPage: number,
    pathParam: number | string,
    filterGroups: FilterGroups[],
    lastUpdate: Date,
  ): Promise<SendHttpRequestResult> {
    /**
     * Start loop to get articles
     */
    let totalCount = 0;
    let currentCount = 0;
    let myCurrentPage = currentPage;

    /**
     * Get magento articles
     */
    let magentoArticles: MagentoArticleModel[] = [];

    do {
      const path =
        MAGENTO_BASE_API_URL +
        this._sharedService.buildURL(
          GET_PRODUCTS,
          {
            pageSize,
            currentPage: myCurrentPage,
          },
          pathParam,
          filterGroups,
        );

      console.log(path);

      await this._httpService
        .axiosRef(path, {
          headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
        })
        .then((response) => {
          totalCount = response.data.total_count;
          currentCount = response.data.items.length;

          if (response.data.items.length > 0) {
            if (response.data.items.length >= pageSize) currentPage++;

            response.data.items.map((item) => {
              const magentoArticle: MagentoArticleModel = {
                ...item,
                pageSize,
                currentPage,
              };

              magentoArticles.push(magentoArticle);
            });
          }

          myCurrentPage++;

          /**
           * clean magento articles
           */
          magentoArticles = magentoArticles.filter(
            (article) => article.status === 1 && article.visibility !== 1,
          );

          console.log(
            `${magentoArticles.length} on ${totalCount} imported... ${
              lastUpdate ? `Updated after ` + lastUpdate : ``
            }`,
          );
        })
        .catch((error) => {
          console.log(
            `${error.syscall} - ${error.code} : errno = ${error.errno}`,
          );
        });
    } while (myCurrentPage < 2);

    if (myCurrentPage === 2) {
      console.log(`End: ${magentoArticles.length} articles to update`);
    }

    return {
      magentoArticles,
      pageSize,
      currentPage: myCurrentPage,
      lastUpdate,
      currentCount,
      totalCount,
    };
  }
}
