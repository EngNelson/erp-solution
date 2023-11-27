import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Jimp from 'jimp';
import {
  AttributeType,
  DEFAULT_PRODUCT_QUANTITY,
  DiscountType,
  getLangOrFirstAvailableValue,
  Image,
  isNullOrWhiteSpace,
  ISOLang,
  MediaGallery,
  MediaType,
  TString,
} from '@glosuite/shared';
import {
  CARACTARS_TO_AVOID,
  NAMES_TO_REPLACE_BEFORE_TREATMENT,
  SPECIAL_WORDS,
  UNIT_SYMBOLS,
  WORDS_TO_EXCLUDE,
  BRAKETS_TO_SKIP,
  WORDS_TO_SKIP,
  COLORS_VALUES,
  MAGENTO_BASE_API_URL,
  GET_CATEGORIES,
  MAGENTO_USER_TOKEN,
  MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
  MAGENTO_PRODUCT_CUSTOM_ATTRIBUTE_CODE,
  SHIPPING_CLASS_MAPPING,
  MAGENTO_PRODUCT_IMAGE_BASE_URL,
  MAGENTO_THUMBNAIL_ATTRIBUTE_CODE,
  MAGENTO_THUMBNAIL_IMAGE_LABEL_ATTRIBUTE_CODE,
  ATTRIBUTE_CODES_TO_SKIP,
  GET_ATTRIBUTES,
  FRONTEND_INPUTS,
  SPECIAL_ATTRIBUTE_CODES,
  PLUS_SIGN,
  PARTS_TO_REPLACE,
  LAST_WORDS_TO_REMOVE,
  ATTRIBUTE_TYPE_MAPPING,
  HARD_ATTRIBUTES,
  HARD_ATTRIBUTES_DEFINED_VALUES,
  GET_PRODUCTS,
  MEDIA_TYPE_MAPPING,
  MAGENTO_PRODUCT_SHORT_DESCRIPTION_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_DESCRIPTION_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_START_DATE_ATTRIBUTE_CODE,
  MAGENTO_PRODUCT_SPECIAL_PRICE_END_DATE_ATTRIBUTE_CODE,
  IMPORT_ARTICLES_NUMBERS_OF_TRIALS,
  DISCOVERY_ATTRIBUTE_CODE,
} from 'src/domain/constants';
import {
  Attribute,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { CrawlCache, CrawlFailure } from 'src/domain/entities/magento';
import { Category, Collection } from 'src/domain/entities/structures';
import { ProductType, ValueType } from 'src/domain/enums/items';
import { ShippingClass } from 'src/domain/enums/orders';
import {
  CategoryLinkModel,
  CustomAttributeModel,
  DefinedAttributeValues,
  DefinedUnitModel,
  MagentoArticleModel,
  MagentoAttributeModel,
  MagentoAttributeOptionModel,
  MediaGalleryEntry,
  PatternOccurrence,
  ProductNamesPatternModel,
} from 'src/domain/interfaces/magento';
import { MagentoCategoryModel } from 'src/domain/interfaces/magento/i.magento-category.model';
import { ProductCategoriesAndCollections } from 'src/domain/interfaces/structures';
import { VariantAttributeValueModel } from 'src/domain/types/catalog/items';
import {
  AttributeRepository,
  AttributeSetRepository,
  AttributeValueRepository,
  ProductCompositionRepository,
  ProductRepository,
  ProductVariantAttributeValuesRepository,
  ProductVariantRepository,
  UnitRepository,
} from 'src/repositories/items';
import {
  CrawlCacheRepository,
  CrawlFailureRepository,
} from 'src/repositories/magento';
import {
  CategoryRepository,
  CollectionRepository,
} from 'src/repositories/structures';
import { SharedService } from '../utilities';
import { CategoryService } from './category.service';
import { CrawlEavService } from './crawl-eav.service';
import { AttributeValueType } from 'src/domain/types/catalog/eav';
import {
  Product,
  ProductComposition,
  ProductVariant,
  ProductVariantAttributeValues,
} from 'src/domain/entities/items';
import {
  MagentoArticleOrdered,
  ProductCreatedFromImport,
} from 'src/domain/interfaces/magento/orders';
import { ItemsReferenceService } from '../references/items';
import { ProductVariantService } from './product-variant.service';
import { ArticleOrdered, Order, Voucher } from 'src/domain/entities/orders';
import {
  ArticleOrderedRepository,
  VoucherRepository,
} from 'src/repositories/orders';
import { StatusLine, StepStatus } from 'src/domain/enums/flows';
import { UpdateMagentoDataService } from './update-magento-data.service';

@Injectable()
export class CrawlArticlesService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(CrawlCache)
    private readonly _crawlCacheRepository: CrawlCacheRepository,
    @InjectRepository(CrawlFailure)
    private readonly _crawlFailureRepository: CrawlFailureRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Product)
    private readonly _productRepository: ProductRepository,
    @InjectRepository(ProductVariant)
    private readonly _productVariantRepository: ProductVariantRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(Voucher)
    private readonly _voucherRepository: VoucherRepository,
    @InjectRepository(ProductVariantAttributeValues)
    private readonly _productVariantAttrValuesRepository: ProductVariantAttributeValuesRepository<any>,
    @InjectRepository(ProductComposition)
    private readonly _productCompositionRepository: ProductCompositionRepository,
    @InjectRepository(ArticleOrdered)
    private readonly _articleOrderedRepository: ArticleOrderedRepository,
    private readonly _httpService: HttpService,
    private readonly _sharedService: SharedService,
    private readonly _crawlEavService: CrawlEavService,
    private readonly _categoryService: CategoryService,
    private readonly _itemsReferenceService: ItemsReferenceService,
    private readonly _productVariantSkuService: ProductVariantService,
    private readonly _updateMagentoDataService: UpdateMagentoDataService,
  ) {}

  public async getProductName(
    originalName: string,
    productNamesPatterns: ProductNamesPatternModel[],
    symbols: string[],
  ): Promise<string> {
    let productName = await this.getProductFromMagentoName(
      originalName,
      productNamesPatterns,
      symbols,
    );

    PARTS_TO_REPLACE.map((part) => {
      const { sources, replaceBy } = part;
      const toReplaces = sources.filter((source) =>
        productName.includes(source),
      );
      toReplaces?.map((toReplace) => {
        productName = productName.replace(toReplace, replaceBy);
      });
    });
    productName = productName.replace('  ', ' ').replace(' -', '');
    productName = this._finalOperationsOnProductName(productName);

    return productName;
  }

  async buildProductNamesPatterns(
    productNames: string[],
    symbols: string[],
  ): Promise<ProductNamesPatternModel[]> {
    try {
      const productNamesPatterns: ProductNamesPatternModel[] = [];

      for (const productName of productNames) {
        const productPatterns = await this._buildProductPattern(
          productName,
          symbols,
        );

        // console.log('name :', productName);

        // console.log('*** parttern', productPatterns, '\n\n\n');

        const productPattern = this._findHighestOccurence(productPatterns);

        // console.log(productPattern);

        const pattern = productNamesPatterns.find(
          (productNamesPattern) =>
            productNamesPattern.patterns.filter(
              (pattern) => pattern === productPattern,
            ).length >= 2,
        );

        if (pattern) {
          pattern.names.push(productName);
        } else {
          productNamesPatterns.push({
            patterns: productPatterns,
            names: [productName],
          });
        }
      }

      return productNamesPatterns;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  private async _buildSingleProductNamesPattern(
    articleName: string,
    symbols: string[],
  ): Promise<ProductNamesPatternModel> {
    try {
      const patterns = await this._buildProductPattern(articleName, symbols);

      const productPattern: ProductNamesPatternModel = {
        patterns,
        names: [articleName],
      };

      return productPattern;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured : ${error.message}`,
      );
    }
  }

  private async _buildProductPattern(
    productName: string,
    symbols: string[],
  ): Promise<string[]> {
    let name1 = '';

    // console.log(productName);

    const nameToReplace = NAMES_TO_REPLACE_BEFORE_TREATMENT.find((value) =>
      productName.includes(value.name),
    );

    if (nameToReplace) {
      const { name, replaceBy } = nameToReplace;
      // console.log(nameToReplace);

      productName = productName.replace(name, replaceBy);

      // console.log(productName);
    }

    productName = productName
      .replace('  ', ' ')
      .replace(',,', ',')
      .replace('–', '-')
      .replace('–', '-')
      .replace("''", '"')
      .replace('”', '"')
      .replace('//', '');

    let namePieces: string[] = [];

    if (this._isNameIncludesBrackets(productName)) {
      productName = this._removeStringBetweenBrackets(productName);

      // if (productName.includes("EBOTAN - Vin d'Oseille"))
      //   console.log(productName);
    }

    const toSkip = WORDS_TO_SKIP.find((toSkip) => productName.includes(toSkip));

    // if (productName.includes("EBOTAN - Vin d'Oseille")) {
    //   console.log(toSkip);
    // }

    if (!isNullOrWhiteSpace(toSkip)) {
      const skipStart = productName.indexOf(toSkip);

      namePieces = productName.replace(toSkip, '').split('-');

      let totalLength = 0;
      let index = 0;

      namePieces.map((namePiece) => {
        // if (productName.includes("EBOTAN - Vin d'Oseille"))
        //   console.log(`piece : ${index} - `, namePiece);

        const pieceLength = namePiece.length;
        totalLength += pieceLength;

        if (
          totalLength >= skipStart &&
          totalLength - skipStart <= pieceLength
        ) {
          const start = skipStart + (totalLength - pieceLength);
          const part_1 = namePiece.slice(0, start);
          const part_2 = namePiece.slice(start + 1, namePiece.length);

          namePiece = `${part_1}${toSkip} ${part_2}`;
          // if (productName.includes("EBOTAN - Vin d'Oseille"))
          //   console.log(`restored : ${index} - `, namePiece);
        }

        namePieces[index] = namePiece;
        index++;
      });
    } else {
      namePieces = productName.split('-');
    }

    // namePieces = productName.split('-');

    // if (productName.includes(STR_TO_SEARCH)) console.log(namePieces, '\n');

    // console.log(symbols);

    namePieces.map(async (name) => {
      // console.log(name);

      // if (name.includes('Papaye/Orange')) {
      //   console.log(
      //     'not includes symbol : ',
      //     !this._isNameIncludeUnitSymbol(name, symbols),
      //   );
      //   console.log(
      //     'not includes excluded word : ',
      //     !this._isNameIncludeExcludedWords(name),
      //   );
      // }

      if (
        !this._isNameIncludeUnitSymbol(name, symbols) &&
        !this._isNameIncludeExcludedWords(name, symbols)
      ) {
        name1 += isNullOrWhiteSpace(name1) ? `${name}` : ` - ${name}`;
      }
    });

    if (isNullOrWhiteSpace(name1)) {
      name1 = namePieces[0];
    }

    name1 = name1.replace('  ', ' ').replace('   ', ' ');

    // console.log('**** ', name1, '\n\n\n');

    const name2 = namePieces[0];

    let name3 =
      !isNullOrWhiteSpace(namePieces[1]) &&
      !this._isNameIncludeUnitSymbol(namePieces[1], symbols) &&
      !this._isNameIncludeExcludedWords(namePieces[1], symbols)
        ? `${namePieces[0]} - ${namePieces[1]}`
        : namePieces[0];

    name3 = name3.replace('  ', ' ').replace('   ', ' ');

    const finalName1 = this._finalOperationToBuildPatterns(
      name1,
      symbols,
    ).trim();
    const finalName2 = this._finalOperationToBuildPatterns(
      name2,
      symbols,
    ).trim();
    const finalName3 = this._finalOperationToBuildPatterns(
      name3,
      symbols,
    ).trim();

    const productPatterns = [finalName1, finalName2, finalName3];

    // if (productName.includes(STR_TO_SEARCH)) {
    //   console.log('*** patterns: ', productPatterns, '\n');
    // }

    // console.log('*** patterns: ', productPatterns, '\n');

    return productPatterns;
  }

  private _removeStringBetweenBrackets(name: string): string {
    let newName = '';

    const [start, end] = [name.indexOf('('), name.indexOf(')')];

    const strToRemove = name.slice(start, end + 1);

    if (!BRAKETS_TO_SKIP.find((word) => word === strToRemove)) {
      if (start !== -1 && end !== -1) {
        newName = name.slice(0, start) + name.slice(end + 1, name.length);
      } else if (start !== -1 && end === -1) {
        newName = name.slice(0, start);
      }
    } else {
      newName = name;
    }

    return newName;
  }

  private _isNameIncludesBrackets(name: string): boolean {
    return name.includes('(') || name.includes(')');
  }

  private _finalOperationToBuildPatterns(
    name: string,
    symbols: string[],
  ): string {
    let result = name;

    const names = name.split(' ');

    names.map((value) => {
      if (this._isNameIncludeUnitSymbol(value, symbols)) {
        symbols.map((symbol) => {
          if (!isNaN(Number(value.replace(symbol, '').replace('/', '')))) {
            result = result.replace(value, '');
          }
        });
      }
    });

    names.map((value) => {
      if (this._isNameIncludeExcludedWords(value, symbols)) {
        result = result.replace(value, '');
      }
    });

    return result;
  }

  private _isNameIncludeUnitSymbol(name: string, symbols: string[]): boolean {
    const symbolsFounds = symbols.filter((symbol) =>
      name.toLowerCase().includes(symbol.toLowerCase()),
    );

    // console.log(`symbols found = ${symbolsFounds}`);
    const sortSymbols = symbolsFounds.sort((a, b) => b.length - a.length);

    // const symbol = sortSymbols[0];

    // if (name.includes(UNITS_TO_SEARCH))
    //   console.log(`symbols[] = ${sortSymbols}`);

    if (
      sortSymbols?.length > 0 &&
      sortSymbols.some((symbol) => UNIT_SYMBOLS.includes(symbol.toUpperCase()))
    ) {
      // const strWithoutSymbol = name
      //   .toLowerCase()
      //   .replace(symbol.toLowerCase(), '')
      //   .replace('/', '')
      //   .trim();

      let strWithoutSymbol = name;
      sortSymbols.map((symbol) => {
        do {
          strWithoutSymbol = strWithoutSymbol
            .toLowerCase()
            .replace(symbol.toLowerCase(), '');
        } while (strWithoutSymbol.toLowerCase().includes(symbol.toLowerCase()));

        strWithoutSymbol = strWithoutSymbol
          .replace('/', '')
          .replace(' – ', '')
          .replace('– ', '')
          .trim();

        // if (strWithoutSymbol.toLowerCase().includes(symbol.toLowerCase()))
        //   strWithoutSymbol = strWithoutSymbol
        //     .toLowerCase()
        //     .replace(symbol.toLowerCase(), '')
        //     .replace('/', '')
        //     .trim();
      });

      const allWords = WORDS_TO_EXCLUDE.filter((word) =>
        name.toLowerCase().includes(word.toLowerCase()),
      );

      const word = allWords.sort((a, b) => b.length - a.length)[0];

      if (!!word) {
        strWithoutSymbol = strWithoutSymbol
          .toLowerCase()
          .replace(word.toLowerCase(), '');
      }

      // SIGNS_TO_REMOVE.map((sign) => {
      //   strWithoutSymbol = strWithoutSymbol.replace(sign, '');
      // });

      // if (name.toLowerCase().includes(UNITS_TO_SEARCH.toLowerCase()))
      //   console.log(`without symbol = ${strWithoutSymbol}`);

      if (!isNaN(Number(strWithoutSymbol))) {
        return true;
      } else {
        return false;
      }
    }
    // console.log('------------------------------------------------');

    return false;
  }

  private _isNameIncludeExcludedWords(
    name: string,
    symbols: string[],
  ): boolean {
    const allWords = WORDS_TO_EXCLUDE.filter((word) =>
      name.toLowerCase().includes(word.toLowerCase()),
    );

    const word = allWords.sort((a, b) => b.length - a.length)[0];

    // if (name.toLowerCase().includes(EXCLUDED_WORD_TO_SEARCH))
    // console.log(`word = ${word}`);

    if (!!word) {
      const nameAfterRemovingWord = name
        .toLowerCase()
        .replace(word.toLowerCase(), '');

      const anotherWord = WORDS_TO_EXCLUDE.find(
        (word) =>
          (nameAfterRemovingWord
            .toLowerCase()
            .includes(' ' + word.toLowerCase() + ' ') ||
            nameAfterRemovingWord
              .toLowerCase()
              .includes(' ' + word.toLowerCase()) ||
            nameAfterRemovingWord
              .toLowerCase()
              .includes(word.toLowerCase() + ' ')) &&
          !SPECIAL_WORDS.find((item) =>
            nameAfterRemovingWord
              .toLowerCase()
              .includes(item.word.toLowerCase()),
          ),
      );

      const caractarToAvoid = CARACTARS_TO_AVOID.find(
        (caractar) =>
          nameAfterRemovingWord === ' ' + caractar + ' ' ||
          nameAfterRemovingWord === ' ' + caractar ||
          nameAfterRemovingWord === caractar + ' ' ||
          nameAfterRemovingWord === caractar,
      );

      const symbol = symbols.find((symbol) =>
        name.toLowerCase().includes(symbol.toLowerCase()),
      );

      const specialWord = SPECIAL_WORDS.find((item) =>
        name.toLowerCase().includes(item.word.toLowerCase()),
      );

      // if (name.includes(EXCLUDED_WORD_TO_SEARCH)) {
      //   console.log(`Word = ${word}`);
      //   console.log(`original name = ${name}`);
      //   console.log(`removed word = '${nameAfterRemovingWord}'`);
      //   console.log(`specialWord = ${specialWord?.word}`);
      //   console.log(`is empty = ${nameAfterRemovingWord.trim().length === 0}`);
      //   console.log(
      //     `has another word to exclude = ${!!anotherWord} - (${anotherWord})`,
      //   );
      //   console.log(
      //     `is number = ${
      //       !(nameAfterRemovingWord.trim().length === 0) &&
      //       !isNaN(Number(nameAfterRemovingWord))
      //     }`,
      //   );
      //   console.log(`has avoid caractar = ${!!caractarToAvoid}`);
      //   console.log(
      //     `has unit = ${this._isNameIncludeUnitSymbol(
      //       nameAfterRemovingWord,
      //       symbols,
      //     )} - (${symbol})`,
      //   );
      //   console.log(`equal = ${nameAfterRemovingWord === name}`);
      //   console.log(
      //     `test = ${
      //       nameAfterRemovingWord.trim().length === 0 ||
      //       !!anotherWord ||
      //       (!(nameAfterRemovingWord.trim().length === 0) &&
      //         !isNaN(Number(nameAfterRemovingWord))) ||
      //       !!caractarToAvoid ||
      //       this._isNameIncludeUnitSymbol(nameAfterRemovingWord, symbols) ||
      //       nameAfterRemovingWord === name
      //     }\n\n\n\n`,
      //   );
      // }

      if (
        specialWord &&
        specialWord.values.find((value) =>
          name.toLowerCase().includes(value.toLowerCase()),
        )
      ) {
        return false;
      } else {
        if (
          nameAfterRemovingWord.trim().length === 0 ||
          !!anotherWord ||
          (!(nameAfterRemovingWord.trim().length === 0) &&
            !isNaN(Number(nameAfterRemovingWord))) ||
          !!caractarToAvoid ||
          this._isNameIncludeUnitSymbol(nameAfterRemovingWord, symbols) ||
          nameAfterRemovingWord === name
        ) {
          return true;
        } else {
          return false;
        }
      }
    }

    // if (
    //   (!!word &&
    //     name.toLowerCase() ===
    //       name.toLowerCase().replace(word.toLowerCase(), '')) ||
    //   (!!word && name.includes('"')) ||
    //   (!!word && name.toLowerCase().includes('garantie'))
    // ) {
    //   const nameAfterRemovingWord = name
    //     .toLowerCase()
    //     .replace(word.toLowerCase(), '');

    //   const specialWord = SPECIAL_WORDS.find((item) =>
    //     name.toLowerCase().includes(item.word.toLowerCase()),
    //   );
    //   // if (name.includes('Contre le Palu')) {
    //   //   console.log(`SPECIAL_WORDS = ${specialWord}`);
    //   // }

    //   if (
    //     specialWord &&
    //     specialWord.values.find((value) =>
    //       name.toLowerCase().includes(value.toLowerCase()),
    //     )
    //   ) {
    //     return false;
    //   } else {
    //     return true;
    //   }
    // }

    return false;
  }

  async getProductFromMagentoName(
    articleName: string,
    productNamesPatterns: ProductNamesPatternModel[],
    symbols: string[],
  ): Promise<string> {
    let productNames: ProductNamesPatternModel = { patterns: [], names: [] };

    productNames = productNamesPatterns.find((namesPattern) =>
      namesPattern.names.some((name) => name === articleName),
    );

    // console.log(productNames);

    if (!productNames) {
      productNames = await this._buildSingleProductNamesPattern(
        articleName,
        symbols,
      );
    }

    const pattern = this._findHighestOccurence(productNames.patterns);

    return pattern;
  }

  private _findHighestOccurence(patterns: string[]): string {
    const patternOccurrences: PatternOccurrence[] = [];

    patterns.map((pattern) => {
      const occurrence = patterns.filter((item) => item === pattern).length;

      if (
        !patternOccurrences.find(
          (patternOccurrence) => patternOccurrence.pattern === pattern,
        )
      ) {
        patternOccurrences.push({ pattern, occurrence });
      }
    });

    const sortPatterns = patternOccurrences.sort(
      (a, b) => b.occurrence - a.occurrence,
    );

    return sortPatterns[0].pattern;
  }

  async getProductSKU(articleSKU: string, symbols: string[]): Promise<string> {
    try {
      let productSKU = articleSKU;

      // console.log(`original sku = ${articleSKU}`);

      const color = COLORS_VALUES.find((item) =>
        articleSKU.includes(item.value.toUpperCase()),
      );

      if (!!color) {
        productSKU = productSKU.replace(color.value.toUpperCase(), '');
      }

      const allSymbols = symbols.filter((symbol) =>
        productSKU.includes(symbol.toUpperCase()),
      );

      const sortSymbols = allSymbols.sort((a, b) => b.length - a.length);

      // console.log(`All symbols = ${sortSymbols}`);

      const symbol = sortSymbols[0];

      if (!!symbol) {
        // console.log(`Symbol used = ${symbol}`);

        const unitIndex = productSKU.indexOf(symbol);
        let index = unitIndex - 1;
        let digit = productSKU.charAt(index);

        while (!!digit && !isNaN(Number(digit))) {
          // productSKU = productSKU.replace(digit, '');
          productSKU = productSKU.slice(0, index) + productSKU.slice(index + 1);
          index--;
          digit = productSKU.charAt(index);
          // console.log(`digit = ${digit}`);
        }

        productSKU = productSKU.replace(symbol, '');
      }

      return productSKU;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  getProductType(articleTypeId: string): string {
    let productType: ProductType;

    if (articleTypeId === 'simple' || articleTypeId === 'virtual') {
      productType = ProductType.SIMPLE;
    }

    if (articleTypeId === 'bundle') {
      productType = ProductType.BUNDLED;
    }

    if (articleTypeId === 'groupe') {
      productType = ProductType.GROUPED;
    }

    return productType;
  }

  async getProductCategoriesAndCollections(
    categoryLinks: CategoryLinkModel[],
  ): Promise<ProductCategoriesAndCollections> {
    try {
      const productCategories: Category[] = [];
      const productCollections: Collection[] = [];

      const magentoCategories: MagentoCategoryModel[] = [];

      const categoryLinksFilter =
        categoryLinks && categoryLinks.length > 0
          ? categoryLinks.filter((category) => category.category_id !== '1913')
          : [];

      /**
       * For each category link\
       * 1. Get category by id from magento api
       */
      if (!!categoryLinksFilter && categoryLinksFilter.length > 0) {
        // console.log('**** TEST = ', categoryLinksFilter);

        await Promise.all(
          categoryLinksFilter?.map(async (categoryLink) => {
            const { position, category_id } = categoryLink;

            /**
             * Get magento category from crawl cache if exist
             * *** If not get from magento API
             */

            const categoryFromCache = await this._crawlCacheRepository.findOne({
              where: {
                categoryId: Number(category_id),
              },
            });

            if (categoryFromCache) {
              console.log(
                `Get category from cache (name = ${categoryFromCache.name})`,
              );

              const magentoCategory: MagentoCategoryModel = {
                id: categoryFromCache.categoryId,
                parent_id: categoryFromCache.parentId,
                name: categoryFromCache.name,
                is_active: categoryFromCache.isActive,
                level: categoryFromCache.level,
                created_at: categoryFromCache.createdAt,
                updated_at: categoryFromCache.updatedAt,
                path: categoryFromCache.path,
                pathArray: categoryFromCache.path.split('/'),
                children:
                  categoryFromCache.children === ''
                    ? []
                    : categoryFromCache.children.split('/').map(Number),
                include_in_menu: categoryFromCache.includeInMenu,
                custom_attributes: categoryFromCache.customAttributes,
              };

              const categoryIsFound = magentoCategories.find(
                (item) => item.id === magentoCategory.id,
              );

              if (
                !categoryIsFound &&
                this._sharedService.isActiveCategory(magentoCategory)
              ) {
                magentoCategories.push(magentoCategory);
              }
            } else {
              const getCategoryPath =
                MAGENTO_BASE_API_URL +
                this._sharedService.buildURL(GET_CATEGORIES, null, category_id);

              console.log(
                `Get categoty/collection by id path = ${getCategoryPath}`,
              );

              let getCategoryStatus = false;

              while (!getCategoryStatus) {
                await this._httpService
                  .axiosRef(getCategoryPath, {
                    headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
                  })
                  .then(async (response) => {
                    /**
                     *
                     */
                    const magentoCategory: MagentoCategoryModel = {
                      id: response.data.id,
                      parent_id: response.data.parent_id,
                      name: response.data.name,
                      is_active: response.data.is_active,
                      level: response.data.level,
                      created_at: response.data.created_at,
                      updated_at: response.data.updated_at,
                      path: response.data.path,
                      pathArray: response.data.path.split('/'),
                      children:
                        response.data.children === ''
                          ? []
                          : response.data.children.split(','),
                      include_in_menu: response.data.include_in_menu,
                      custom_attributes: response.data.custom_attributes,
                    };

                    const categoryIsFound = magentoCategories.find(
                      (item) => item.id === magentoCategory.id,
                    );

                    if (
                      !categoryIsFound &&
                      this._sharedService.isActiveCategory(magentoCategory)
                    ) {
                      magentoCategories.push(magentoCategory);
                    }

                    /**
                     * Save the magento category on crawl cache
                     */
                    const categoryCache = new CrawlCache();

                    categoryCache.categoryId = magentoCategory.id;
                    categoryCache.parentId = magentoCategory.parent_id;
                    categoryCache.name = magentoCategory.name.trim();
                    categoryCache.isActive = magentoCategory.is_active;
                    categoryCache.level = magentoCategory.level;
                    categoryCache.createdAt = magentoCategory.created_at;
                    categoryCache.updatedAt = magentoCategory.updated_at;
                    categoryCache.path = magentoCategory.path;
                    categoryCache.children = response.data.children;
                    categoryCache.includeInMenu =
                      magentoCategory.include_in_menu;
                    categoryCache.customAttributes =
                      magentoCategory.custom_attributes;

                    await this._crawlCacheRepository.save(categoryCache);

                    // console.log('** categories = ', magentoCategories);

                    getCategoryStatus = true;
                  })
                  .catch((error) => {
                    console.log(
                      `${error.syscall} - ${error.code} : errno = ${error.errno}`,
                    );
                    // throw new InternalServerErrorException(error);
                  });
              }
            }
          }),
        );

        const sortMagentoCategories = magentoCategories.sort(
          (a, b) => b.level - a.level,
        );

        // console.log('magento categories = ', magentoCategories);

        // console.log('magento sorted categories = ', sortMagentoCategories);

        const categoriesToPush: MagentoCategoryModel[] = [];
        const collectionsToPush: MagentoCategoryModel[] = [];

        if (sortMagentoCategories && sortMagentoCategories.length > 0) {
          await Promise.all(
            sortMagentoCategories?.map(async (categoryToPush) => {
              const pushCategory =
                await this._pushMagentoCategoryOnProductCategories(
                  categoryToPush,
                  sortMagentoCategories,
                );

              // console.log(
              //   `---- TEST RESULT "${categoryToPush.name}" = `,
              //   !!pushCategory ? pushCategory.id : pushCategory,
              // );

              // console.log(
              //   `--------------- CATEGORY ${categoryToPush.name} children = `,
              //   categoryToPush.children.length,
              // );

              // console.log(
              //   `PUSH CATEGORY: ${categoryToPush.name} ? = `,
              //   !!pushCategory,
              // );

              if (!!categoryToPush.id) {
                if (pushCategory) {
                  categoriesToPush.push(pushCategory);
                } else if (!categoryToPush.include_in_menu) {
                  collectionsToPush.push(categoryToPush);
                }
              }
            }),
          );

          if (categoriesToPush.length === 0) {
            categoriesToPush.push(
              sortMagentoCategories?.find(
                (sortCategory) => sortCategory.children.length === 0,
              ),
            );
          }
        }

        // if (categoriesToPush.length === 0) {
        //   console.log(`************ No category to push for ${name}`);
        //   console.log('************ Categories links = ', categoryLinks);

        //   throw new InternalServerErrorException(`No category to push`);
        // }

        if (categoriesToPush.length > 0) {
          await Promise.all(
            categoriesToPush?.map(async (categoryToPush) => {
              // Get the category by magentoId from ERP
              let productCategory = await this._categoryRepository.findOne({
                where: {
                  magentoId: categoryToPush.id,
                },
              });

              if (!productCategory) {
                // Create the category
                console.log(
                  'CREATE THE NEW CATEGORY = ',
                  categoryToPush.name.toUpperCase(),
                );
                productCategory = new Category();
                productCategory.magentoId = categoryToPush.id;
                productCategory.title = this._sharedService.buildTStringValue(
                  categoryToPush.name,
                  ISOLang.FR,
                );

                const catDescription = categoryToPush.custom_attributes.find(
                  (customElt) =>
                    customElt.attribute_code ===
                    MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
                );
                if (!!catDescription) {
                  productCategory.description =
                    this._sharedService.buildTStringValue(
                      catDescription.value,
                      ISOLang.FR,
                    );
                }

                productCategory.symbol =
                  await this._categoryService.generateCategorySumbol(
                    categoryToPush.name,
                  );

                if (!!categoryToPush.parent_id) {
                  const parentCategory = await this._categoryRepository.findOne(
                    {
                      where: {
                        magentoId: categoryToPush.parent_id,
                      },
                    },
                  );
                  if (parentCategory) {
                    productCategory.parentCategory = parentCategory;
                  }
                }

                const subCategories: Category[] = [];

                if (
                  categoryToPush.children &&
                  categoryToPush.children.length > 0
                ) {
                  await Promise.all(
                    categoryToPush.children.map(async (childId) => {
                      if (!!childId) {
                        const subCategory =
                          await this._categoryRepository.findOne({
                            where: {
                              magentoId: childId,
                            },
                          });
                        if (subCategory) {
                          subCategories.push(subCategory);
                        }
                      }
                    }),
                  );

                  if (subCategories.length > 0) {
                    productCategory.subCategories = subCategories;
                  }
                }

                productCategory.magentoCreatedAt = categoryToPush.created_at;
                productCategory.magentoUpdatedAt = categoryToPush.updated_at;
                await this._categoryRepository.save(productCategory);
              }

              productCategories.push(productCategory);
            }),
          );
        }

        if (collectionsToPush.length > 0) {
          await Promise.all(
            collectionsToPush?.map(async (collectionToPush) => {
              // get collection from magentoId from ERP
              // console.log('**** TEST 1 = ', collectionToPush.id, '\n\n');

              let productCollection = !!collectionToPush.id
                ? await this._collectionRepository.findOne({
                    where: {
                      magentoId: collectionToPush.id,
                    },
                  })
                : undefined;

              if (!productCollection) {
                console.log(
                  'CREATE THE NEW COLLECTION = ',
                  collectionToPush.name.toUpperCase(),
                );

                productCollection = new Collection();

                productCollection.title = this._sharedService.buildTStringValue(
                  collectionToPush.name,
                  ISOLang.FR,
                );
                const colDescription = collectionToPush.custom_attributes.find(
                  (customElt) =>
                    customElt.attribute_code ===
                    MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
                );
                if (!!colDescription) {
                  productCollection.description =
                    this._sharedService.buildTStringValue(
                      colDescription.value,
                      ISOLang.FR,
                    );
                }
                productCollection.magentoId = collectionToPush.id;
                productCollection.magentoCreatedAt =
                  collectionToPush.created_at;
                productCollection.magentoUpdatedAt =
                  collectionToPush.updated_at;

                // console.log(
                //   '***** TEST 2 = ',
                //   collectionToPush.parent_id,
                //   '\n\n\n',
                // );

                if (!!collectionToPush.parent_id) {
                  const parentCollection =
                    await this._collectionRepository.findOne({
                      where: {
                        magentoId: collectionToPush.parent_id,
                      },
                    });
                  if (parentCollection) {
                    productCollection.parentCollection = parentCollection;
                  }
                }

                const subCollections: Collection[] = [];
                if (
                  collectionToPush.children &&
                  collectionToPush.children.length > 0
                ) {
                  await Promise.all(
                    collectionToPush.children.map(async (childId) => {
                      // console.log('****** TEST 3 = ', childId, '\n\n\n\n');

                      if (!!childId) {
                        const subCollection =
                          await this._collectionRepository.findOne({
                            where: {
                              magentoId: childId,
                            },
                          });
                        if (subCollection) {
                          subCollections.push(subCollection);
                        }
                      }
                    }),
                  );

                  if (subCollections.length > 0) {
                    productCollection.subCollections = subCollections;
                  }
                }

                await this._collectionRepository.save(productCollection);
              }

              productCollections.push(productCollection);
            }),
          );
        }
      }

      // console.log(`productCategories = `, productCategories);
      const output: ProductCategoriesAndCollections = {
        productCategories: productCategories,
        productCollections: productCollections,
      };

      return output;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  private async _pushMagentoCategoryOnProductCategories(
    magentoCategory: MagentoCategoryModel,
    sortMagentoCategories: MagentoCategoryModel[],
  ): Promise<MagentoCategoryModel> {
    let categoryToPush: MagentoCategoryModel;

    if (magentoCategory.children.length === 0) {
      if (magentoCategory.include_in_menu) {
        categoryToPush = magentoCategory;
      }
    } else {
      const child = magentoCategory.children?.find(
        (childId) =>
          !!sortMagentoCategories.find(
            (sortCategory) => sortCategory.id === Number(childId),
          ),
      );

      const anotherChild = sortMagentoCategories.find(
        (sortCategory) =>
          sortCategory.pathArray.includes(String(magentoCategory.id)) &&
          sortCategory.id !== magentoCategory.id,
      );

      if (!(!!child || !!anotherChild)) {
        categoryToPush = magentoCategory;
      }
    }

    return categoryToPush;
  }

  async getVariantShippingClass(
    customAttributes: CustomAttributeModel[],
  ): Promise<ShippingClass> {
    let shippingClass: ShippingClass;

    const customAttribute = customAttributes.find(
      (attribute) =>
        attribute.attribute_code === MAGENTO_PRODUCT_CUSTOM_ATTRIBUTE_CODE,
    );

    if (customAttribute) {
      const shippingClassAttr = SHIPPING_CLASS_MAPPING.find(
        (classMapping) => classMapping.input === customAttribute.value,
      );

      if (shippingClassAttr) {
        shippingClass = shippingClassAttr.output;

        return shippingClass;
      }
    }

    shippingClass = ShippingClass.MEDIUM;

    return shippingClass;
  }

  getVariantThumbnailURL(
    mediaGallery: MediaGalleryEntry[],
    customAttributes: CustomAttributeModel[],
  ): MediaGalleryEntry {
    let thumbnail: MediaGalleryEntry;

    const findOnMediaGallery = mediaGallery.find(
      (media) =>
        !!media.types.find((type) => type === MAGENTO_THUMBNAIL_ATTRIBUTE_CODE),
    );

    if (findOnMediaGallery) {
      thumbnail = findOnMediaGallery;
    } else {
      const thumbnailAttribute = customAttributes.find(
        (attribute) =>
          attribute.attribute_code === MAGENTO_THUMBNAIL_ATTRIBUTE_CODE,
      );

      const file = !!thumbnailAttribute ? thumbnailAttribute.value : null;

      const labelAttribute = customAttributes.find(
        (attribute) =>
          attribute.attribute_code ===
          MAGENTO_THUMBNAIL_IMAGE_LABEL_ATTRIBUTE_CODE,
      );

      const label = !!labelAttribute ? labelAttribute.value : null;

      thumbnail = {
        media_type: 'image',
        label,
        disabled: false,
        types: [],
        file,
      };
    }

    return thumbnail;
  }

  async getVariantThumbnail(imagePath: string): Promise<string> {
    const path = imagePath.split('/');
    const imageName = path.reverse()[0];

    Jimp.read(MAGENTO_PRODUCT_IMAGE_BASE_URL + imagePath)
      .then((image) => {
        image.write(imageName);
      })
      .catch((error) => {
        console.log(error);
        throw new InternalServerErrorException(error);
      });

    return imageName;
  }

  async getVariantAttributeValues(
    customAttributes: CustomAttributeModel[],
    unitsAdded: Unit[],
    magentoSKU?: string,
  ): Promise<[VariantAttributeValueModel<any>[], Unit[]]> {
    try {
      const attributeValuesData: VariantAttributeValueModel<any>[] = [];

      if (customAttributes && customAttributes.length > 0) {
        for (const customAttribute of customAttributes) {
          const { attribute_code, value } = customAttribute;

          if (!ATTRIBUTE_CODES_TO_SKIP.includes(attribute_code)) {
            /**
             * Get magento attribute from cache if exist
             * *** If not get from magento API
             */

            const attributeFromCache = await this._crawlCacheRepository.findOne(
              {
                where: {
                  attributeCode: attribute_code,
                },
              },
            );

            if (attributeFromCache) {
              console.log(
                `Get attribute from cache (attribute code = ${attribute_code})`,
              );

              const magentoAttribute: MagentoAttributeModel = {
                id: attributeFromCache.attributeId,
                attribute_code: attributeFromCache.attributeCode,
                frontend_input: attributeFromCache.frontendInput,
                options: attributeFromCache.options,
                is_user_defined: attributeFromCache.isUserDefined,
                default_frontend_label: attributeFromCache.defaultFrontendLabel,
                frontend_labels: attributeFromCache.frontendLabels,
                backend_type: attributeFromCache.backendType,
              };

              if (magentoAttribute.is_user_defined) {
                // Get attribute by magentoId from ERP
                let attribute = await this._attributeRepository.findOne({
                  where: {
                    magentoId: magentoAttribute.id,
                  },
                  relations: ['units'],
                });

                // console.log('ATTRIBUTE FOUND ===== ', attribute);

                if (!attribute) {
                  // Create the attribute
                  console.log(
                    '************** CREATE NEW ATTRIBUTE FOR 1 ',
                    attribute_code,
                  );

                  attribute = await this._createNewAttribute(magentoAttribute);
                }

                // Extract value and unit from value
                let label: string;
                let valueToSaved:
                  | boolean
                  | number
                  | number[]
                  | string
                  | string[]
                  | object;
                let unit: Unit;

                if (
                  magentoAttribute.frontend_input === FRONTEND_INPUTS.boolean
                ) {
                  label = value;
                  valueToSaved = label === '1' ? true : false;
                } else if (
                  magentoAttribute.frontend_input === FRONTEND_INPUTS.text ||
                  magentoAttribute.frontend_input === FRONTEND_INPUTS.textarea
                ) {
                  label = value;
                  const attributeValue = this._getUnitAndValueFromLabel(
                    label,
                    attribute_code,
                  );
                  valueToSaved = attributeValue.value;

                  if (attributeValue.unit) {
                    unit = await this._unitRepository.findOne({
                      where: {
                        symbol: attributeValue.unit.symbol,
                      },
                    });

                    if (!unit) {
                      unit = new Unit();

                      unit.title = this._sharedService.buildTStringValue(
                        attributeValue.unit.title,
                        ISOLang.FR,
                      );
                      unit.symbol = attributeValue.unit.symbol;

                      await this._unitRepository.save(unit);

                      unitsAdded.push(unit);
                    }
                  }

                  if (
                    attribute_code === DISCOVERY_ATTRIBUTE_CODE &&
                    typeof valueToSaved === 'number' &&
                    valueToSaved > 0 &&
                    !!magentoSKU
                  ) {
                    // Sync magento stock
                    this._updateMagentoDataService.updateSingleProductQty(
                      magentoSKU,
                      valueToSaved,
                    );
                  }
                } else if (
                  attribute.valueType === ValueType.DROPDOWN ||
                  attribute.valueType === ValueType.MULTIPLE_SELECT ||
                  attribute.valueType === ValueType.INPUT_FIELD
                ) {
                  label = this._getLabelFromOptions(
                    value,
                    magentoAttribute.options,
                  );

                  // console.log('+++++++ TEST LABEL = ', label);

                  if (label) {
                    if (attribute.type === AttributeType.STRING) {
                      valueToSaved = label;
                    } else if (attribute.type === AttributeType.NUMBER) {
                      const attributeValue = this._getUnitAndValueFromLabel(
                        label,
                        attribute_code,
                      );

                      valueToSaved = attributeValue.value;

                      if (attributeValue.unit) {
                        unit = await this._unitRepository.findOne({
                          where: {
                            symbol: attributeValue.unit.symbol,
                          },
                        });

                        if (!unit) {
                          unit = new Unit();

                          unit.title = this._sharedService.buildTStringValue(
                            attributeValue.unit.title,
                            ISOLang.FR,
                          );
                          unit.symbol = attributeValue.unit.symbol;

                          await this._unitRepository.save(unit);

                          unitsAdded.push(unit);
                        }

                        if (
                          !attribute.units.find(
                            (unitExist) => unitExist.id === unit.id,
                          )
                        ) {
                          attribute.units.push(unit);
                          attribute.hasUnit = true;

                          await this._attributeRepository.save(attribute);
                        }
                      }
                    }
                  } else {
                    valueToSaved = value;
                  }

                  const attributeValueData: VariantAttributeValueModel<any> = {
                    attribute,
                    value: valueToSaved,
                    unit,
                  };

                  attributeValuesData.push(attributeValueData);

                  if (attribute.valueType !== ValueType.INPUT_FIELD) {
                    const attributeValues =
                      await this._attributeValueRepository.find({
                        where: { attributeId: attribute.id },
                      });

                    // console.log('Test 1 ====== ', attributeValues);

                    if (
                      (attributeValues.length > 0 &&
                        !attributeValues.find(
                          (attrValue) =>
                            attrValue?.value?.value == attributeValueData.value,
                        )) ||
                      attributeValues.length === 0
                    ) {
                      const attributeValue = new AttributeValue();

                      attributeValue.value = {
                        value: valueToSaved as TString | string | number,
                      };
                      attributeValue.attributeId = attribute.id;
                      attributeValue.attribute = attribute;
                      if (unit) {
                        attributeValue.unitId = unit.id;
                        attributeValue.unit = unit;
                      }

                      await this._attributeValueRepository.save(attributeValue);
                    }
                  }
                } else if (
                  attribute.type === AttributeType.OBJECT &&
                  attribute.valueType === ValueType.COLOR
                ) {
                  label = this._getLabelFromOptions(
                    value,
                    magentoAttribute.options,
                  );

                  console.log('Find color 1 : ', label);

                  let code: string;

                  if (!isNullOrWhiteSpace(label) && label !== 'Default') {
                    code = COLORS_VALUES.find(
                      (color) =>
                        color.value.toLowerCase() === label.toLowerCase(),
                    )?.match;

                    if (!code) {
                      console.log(
                        'COLOR NOT FOUND ================================ ',
                        label,
                      );
                    }
                  } else {
                    label = 'Blanc';
                  }

                  valueToSaved = {
                    code: code ? code : '#ffffff',
                    value: this._sharedService.buildTStringValue(
                      label,
                      ISOLang.FR,
                    ),
                  };

                  console.log('Value ======== ', valueToSaved);
                }

                const attributeValueData: VariantAttributeValueModel<any> = {
                  attribute,
                  value: valueToSaved,
                  unit,
                };

                attributeValuesData.push(attributeValueData);

                const attributeValues =
                  await this._attributeValueRepository.find({
                    where: { attributeId: attribute.id },
                  });

                // console.log('Test 2 ====== ', attributeValues);

                if (
                  (attributeValues.length > 0 &&
                    !attributeValues.find(
                      (attrValue) =>
                        attrValue?.value?.code ==
                          attributeValueData.value?.code ||
                        getLangOrFirstAvailableValue(
                          attrValue?.value?.value as TString,
                          ISOLang.FR,
                        ) ==
                          getLangOrFirstAvailableValue(
                            attributeValueData.value as TString,
                            ISOLang.FR,
                          ) ||
                        attrValue.value == attributeValueData.value,
                    )) ||
                  attributeValues.length === 0
                ) {
                  // console.log('Test attributeId value === ', attribute.id);

                  const attributeValue = new AttributeValue();

                  attributeValue.value = attributeValueData.value;
                  attributeValue.attributeId = attribute.id;
                  attributeValue.attribute = attribute;

                  if (attributeValue.value)
                    await this._attributeValueRepository.save(attributeValue);
                } else {
                  console.log(
                    `============== Attribute value ${
                      attributeValueData.value
                    } for attribute ${getLangOrFirstAvailableValue(
                      attribute.name,
                      ISOLang.FR,
                    )} already exists =============`,
                  );
                }
              }
            } else {
              const getAttributePath =
                MAGENTO_BASE_API_URL +
                this._sharedService.buildURL(
                  GET_ATTRIBUTES,
                  null,
                  attribute_code,
                );

              console.log(
                `Get attribute by attribute_code path = ${getAttributePath}`,
              );

              // let getAttributeStatus: boolean = false;

              await this._httpService
                .axiosRef(getAttributePath, {
                  headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
                })
                .then(async (response) => {
                  const magentoAttribute: MagentoAttributeModel = {
                    id: response.data.attribute_id,
                    attribute_code: response.data.attribute_code,
                    frontend_input: response.data.frontend_input,
                    options: response.data.options,
                    is_user_defined: response.data.is_user_defined,
                    default_frontend_label:
                      response.data.default_frontend_label,
                    frontend_labels: response.data.frontend_labels,
                    backend_type: response.data.backend_type,
                  };

                  if (magentoAttribute.is_user_defined) {
                    // Get attribute by magentoId from ERP
                    let attribute = await this._attributeRepository.findOne({
                      where: {
                        magentoId: magentoAttribute.id,
                      },
                      relations: ['units'],
                    });

                    if (!attribute) {
                      // Create the attribute
                      console.log(
                        '************** CREATE NEW ATTRIBUTE FOR 2 ',
                        attribute_code,
                      );

                      attribute = await this._createNewAttribute(
                        magentoAttribute,
                      );
                    }

                    // Extract value and unit from value
                    let label: string;
                    let valueToSaved:
                      | boolean
                      | number
                      | number[]
                      | string
                      | string[]
                      | object;
                    let unit: Unit;

                    if (
                      magentoAttribute.frontend_input ===
                      FRONTEND_INPUTS.boolean
                    ) {
                      label = value;
                      valueToSaved = label === '1' ? true : false;
                    } else if (
                      magentoAttribute.frontend_input ===
                        FRONTEND_INPUTS.text ||
                      magentoAttribute.frontend_input ===
                        FRONTEND_INPUTS.textarea
                    ) {
                      label = value;
                      const attributeValue = this._getUnitAndValueFromLabel(
                        label,
                        attribute_code,
                      );
                      valueToSaved = attributeValue.value;

                      if (attributeValue.unit) {
                        unit = await this._unitRepository.findOne({
                          where: {
                            symbol: attributeValue.unit.symbol,
                          },
                        });

                        if (!unit) {
                          unit = new Unit();

                          unit.title = this._sharedService.buildTStringValue(
                            attributeValue.unit.title,
                            ISOLang.FR,
                          );
                          unit.symbol = attributeValue.unit.symbol;

                          await this._unitRepository.save(unit);

                          unitsAdded.push(unit);
                        }
                      }

                      if (
                        attribute_code === DISCOVERY_ATTRIBUTE_CODE &&
                        typeof valueToSaved === 'number' &&
                        valueToSaved > 0
                      ) {
                        // Sync magento stock
                        this._updateMagentoDataService.updateSingleProductQty(
                          magentoSKU,
                          valueToSaved,
                        );
                      }
                    } else if (
                      attribute.valueType === ValueType.DROPDOWN ||
                      attribute.valueType === ValueType.MULTIPLE_SELECT ||
                      attribute.valueType === ValueType.INPUT_FIELD
                    ) {
                      label = this._getLabelFromOptions(
                        value,
                        magentoAttribute.options,
                      );

                      // console.log('+++++++ TEST LABEL = ', label);

                      if (label) {
                        if (attribute.type === AttributeType.STRING) {
                          valueToSaved = label;
                        } else if (attribute.type === AttributeType.NUMBER) {
                          const attributeValue = this._getUnitAndValueFromLabel(
                            label,
                            attribute_code,
                          );

                          valueToSaved = attributeValue.value;

                          if (attributeValue.unit) {
                            unit = await this._unitRepository.findOne({
                              where: {
                                symbol: attributeValue.unit.symbol,
                              },
                            });

                            if (!unit) {
                              unit = new Unit();

                              unit.title =
                                this._sharedService.buildTStringValue(
                                  attributeValue.unit.title,
                                  ISOLang.FR,
                                );
                              unit.symbol = attributeValue.unit.symbol;

                              await this._unitRepository.save(unit);

                              unitsAdded.push(unit);
                            }

                            if (
                              !attribute.units.find(
                                (unitExist) => unitExist.id === unit.id,
                              )
                            ) {
                              attribute.units.push(unit);
                              attribute.hasUnit = true;

                              await this._attributeRepository.save(attribute);
                            }
                          }
                        }
                      } else {
                        valueToSaved = value;
                      }

                      const attributeValueData: VariantAttributeValueModel<any> =
                        {
                          attribute,
                          value: valueToSaved,
                          unit,
                        };

                      attributeValuesData.push(attributeValueData);

                      if (attribute.valueType !== ValueType.INPUT_FIELD) {
                        const attributeValues =
                          await this._attributeValueRepository.find({
                            where: { attributeId: attribute.id },
                          });

                        // console.log('Test 3 ====== ', attributeValues);

                        if (
                          (attributeValues.length > 0 &&
                            !attributeValues.find(
                              (attrValue) =>
                                attrValue?.value?.value ==
                                attributeValueData.value,
                            )) ||
                          attributeValues.length === 0
                        ) {
                          const attributeValue = new AttributeValue();

                          attributeValue.value = {
                            value: valueToSaved as TString | string | number,
                          };
                          attributeValue.attributeId = attribute.id;
                          attributeValue.attribute = attribute;
                          if (unit) {
                            attributeValue.unitId = unit.id;
                            attributeValue.unit = unit;
                          }

                          if (attributeValue.value)
                            await this._attributeValueRepository.save(
                              attributeValue,
                            );
                        }
                      }
                    } else if (
                      attribute.type === AttributeType.OBJECT &&
                      attribute.valueType === ValueType.COLOR
                    ) {
                      label = this._getLabelFromOptions(
                        value,
                        magentoAttribute.options,
                      );

                      console.log('Find color 2: ', label);

                      let code: string;
                      if (!isNullOrWhiteSpace(label) && label !== 'Default') {
                        code = COLORS_VALUES.find(
                          (color) =>
                            color.value.toLowerCase() === label.toLowerCase(),
                        )?.match;

                        if (!code) {
                          console.log(
                            'COLOR NOT FOUND ================================ ',
                            label,
                          );
                        }
                      } else {
                        label = 'Blanc';
                      }

                      valueToSaved = {
                        code: code ? code : '#ffffff',
                        value: this._sharedService.buildTStringValue(
                          label,
                          ISOLang.FR,
                        ),
                      };

                      console.log('Value ======== ', valueToSaved);
                    }

                    const attributeValueData: VariantAttributeValueModel<any> =
                      {
                        attribute,
                        value: valueToSaved,
                        unit,
                      };

                    attributeValuesData.push(attributeValueData);

                    const attributeValues =
                      await this._attributeValueRepository.find({
                        where: { attributeId: attribute.id },
                      });

                    // console.log('Test 4 ====== ', attributeValues);

                    if (
                      (attributeValues.length > 0 &&
                        !attributeValues.find(
                          (attrValue) =>
                            attrValue?.value?.code ==
                              attributeValueData.value?.code ||
                            getLangOrFirstAvailableValue(
                              attrValue?.value?.value as TString,
                              ISOLang.FR,
                            ) ==
                              getLangOrFirstAvailableValue(
                                attributeValueData.value as TString,
                                ISOLang.FR,
                              ) ||
                            attrValue.value == attributeValueData.value,
                        )) ||
                      attributeValues.length === 0
                    ) {
                      const attributeValue = new AttributeValue();

                      attributeValue.value = attributeValueData.value;
                      attributeValue.attributeId = attribute.id;
                      attributeValue.attribute = attribute;

                      if (attributeValue.value)
                        await this._attributeValueRepository.save(
                          attributeValue,
                        );
                    } else {
                      console.log(
                        `============== Attribute value ${
                          attributeValueData.value
                        } for attribute ${getLangOrFirstAvailableValue(
                          attribute.name,
                          ISOLang.FR,
                        )} already exists =============`,
                      );
                    }
                  }

                  /**
                   * Save the magento attribute on crawl cache
                   */
                  const attributeCache = new CrawlCache();

                  attributeCache.attributeId = magentoAttribute.id;
                  attributeCache.attributeCode =
                    magentoAttribute.attribute_code;
                  attributeCache.frontendInput =
                    magentoAttribute.frontend_input;
                  attributeCache.options = magentoAttribute.options;
                  attributeCache.isUserDefined =
                    magentoAttribute.is_user_defined;
                  attributeCache.defaultFrontendLabel =
                    magentoAttribute.default_frontend_label;
                  attributeCache.backendType = magentoAttribute.backend_type;
                  attributeCache.frontendLabels =
                    magentoAttribute.frontend_labels;

                  await this._crawlCacheRepository.save(attributeCache);

                  // getAttributeStatus = true;
                })
                .catch((error) => {
                  console.log(
                    `${error.syscall} - ${error.code} : errno = ${error.errno} FOR ATTRIBUTE CODE ${attribute_code}`,
                  );
                  // throw new InternalServerErrorException(error);
                });
            }
          }
        }
      }

      return [attributeValuesData, unitsAdded];
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  async importSingleProduct(sku: string): Promise<ProductVariant> {
    try {
      let magentoArticle: MagentoArticleModel;
      let success = 0;
      let numberOfTrials = 0;

      /**
       * Verify if sku contains special characters
       */

      do {
        if (numberOfTrials === IMPORT_ARTICLES_NUMBERS_OF_TRIALS) {
          console.log(
            `${numberOfTrials} unsuccessful attempts to import '${sku}' article`,
          );
          break;
        }

        const path =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(
            GET_PRODUCTS,
            null,
            encodeURIComponent(sku),
          );

        console.log(`Import single product: Try n ${numberOfTrials + 1}`, path);

        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then(async (response) => {
            magentoArticle = { ...response.data };
            success = 1;
          })
          .catch(async (error) => {
            numberOfTrials++;
            success = 0;
            if (numberOfTrials === IMPORT_ARTICLES_NUMBERS_OF_TRIALS) {
              let failure = await this._crawlFailureRepository.findOne({
                where: { entity: ProductVariant.name },
              });

              if (failure) {
                if (!failure.logs.find((log) => log === sku)) {
                  failure.logs.push(sku);
                }
              } else {
                failure = new CrawlFailure();

                failure.entity = ProductVariant.name;
                failure.logs = [sku];
              }

              await this._crawlFailureRepository.save(failure);
            }
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}. ${error}`,
            );
          });
      } while (
        success === 0 ||
        numberOfTrials === IMPORT_ARTICLES_NUMBERS_OF_TRIALS
      );

      let productVariant: ProductVariant;

      if (magentoArticle) {
        const symbols: string[] = [];
        const unitsFromDB = await this._unitRepository.find();
        unitsFromDB.map((unit) => symbols.push(unit.symbol));

        const productNamesPatterns = await this.buildProductNamesPatterns(
          [magentoArticle.name],
          symbols,
        );

        const units: Unit[] = [];

        console.log(`Article comming from magento: ${magentoArticle?.name}`);

        const simpleProductCreated = await this.createSimpleProduct(
          magentoArticle,
          productNamesPatterns,
          symbols,
          units,
        );

        console.log('Test ======= ', simpleProductCreated.variant?.reference);

        const { variant, ...data } = simpleProductCreated;

        console.log('New variant imported successfully: ', variant?.reference);

        productVariant = variant;
      }

      return productVariant;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  async createBundleProduct(
    magentoArticle: MagentoArticleModel,
    productNamesPatterns: ProductNamesPatternModel[],
    symbols: string[],
  ): Promise<ProductCreatedFromImport> {
    try {
      let productVariant: ProductVariant;

      /**
       * 1.1  Get product Name
       */
      const productName = await this.getProductFromMagentoName(
        magentoArticle.name,
        productNamesPatterns,
        symbols,
      );

      /**
       * 1.2  Get product SKU
       */
      const productSKU = await this.getProductSKU(magentoArticle.sku, symbols);

      /**
       * Check if the product already exists
       */
      let product = await this._productRepository.findOne({
        where: {
          sku: productSKU,
        },
      });

      const { bundle_product_options, category_links } =
        magentoArticle.extension_attributes;

      if (!product) {
        /**
         * 1.3 Get product categories and collections
         */
        const { productCategories, productCollections } =
          await this.getProductCategoriesAndCollections(category_links);

        /**
         * Proceed with the product creation
         */
        product = new Product();

        product.reference =
          await this._itemsReferenceService.generateProductReference(
            ProductType.BUNDLED,
          );

        console.log(
          `\n\n\n**** product reference = ${product.reference}\n\n\n\n`,
        );

        product.sku = productSKU;
        product.title = this._sharedService.buildTStringValue(
          productName,
          ISOLang.FR,
        );
        product.productType = ProductType.BUNDLED;
        product.categories = productCategories;
        product.quantity = DEFAULT_PRODUCT_QUANTITY;

        await this._productRepository.save(product);

        /**
         * Create product compositions
         */

        if (bundle_product_options && bundle_product_options.length > 0) {
          const productCompositonsToAdd: ProductComposition[] = [];
          let position = 0;

          await Promise.all(
            bundle_product_options[0].product_links.map(async (productLink) => {
              const { id, sku, qty, is_default, price, can_change_quantity } =
                productLink;

              const childSKU = await this.getProductSKU(sku, symbols);
              const child = await this._productRepository.findOne({
                where: {
                  sku: childSKU,
                },
              });

              if (child) {
                const productComposition = new ProductComposition();

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
            }),
          );

          await this._productCompositionRepository.save(
            productCompositonsToAdd,
          );

          product.children = productCompositonsToAdd;

          await this._productRepository.save(product);
        }
      }

      const result: ProductCreatedFromImport = {
        product,
        variant: productVariant,
      };

      return result;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  async createSimpleProduct(
    magentoArticle: MagentoArticleModel,
    productNamesPatterns: ProductNamesPatternModel[],
    symbols: string[],
    units: Unit[],
  ): Promise<ProductCreatedFromImport> {
    try {
      let productVariant: ProductVariant;
      // 1. Create simple Product if not exist and push on products

      /**
       * 1.1 Get Product name
       */
      const productName = await this.getProductName(
        magentoArticle.name,
        productNamesPatterns,
        symbols,
      );

      console.log(`Get product name: ${productName}`);

      const productSKU = await this.getProductSKU(magentoArticle.sku, symbols);

      console.log(`Get product SKU: ${productSKU}`);

      /**
       * Check if the product already exists
       */

      let product = await this._productRepository.findOne({
        where: {
          sku: productSKU,
        },
      });

      console.log(
        `Product found: ${getLangOrFirstAvailableValue(
          product?.title,
          ISOLang.FR,
        )}`,
      );

      if (!product) {
        /**
         * 1.3 Get Product attribute set
         */
        const attributeSet = await this._attributeSetRepository.findOne({
          where: {
            magentoId: magentoArticle.attribute_set_id,
          },
        });

        /**
         * 1.3 Get product categories
         */

        const { productCategories, productCollections } =
          await this.getProductCategoriesAndCollections(
            magentoArticle.extension_attributes.category_links,
          );

        /**
         * Proceed with the product creation
         */
        product = new Product();

        product.reference =
          await this._itemsReferenceService.generateProductReference(
            ProductType.SIMPLE,
          );

        console.log(
          `\n\n\n**** product reference = ${product.reference}\n\n\n\n`,
        );

        product.sku = productSKU;

        product.title = this._sharedService.buildTStringValue(
          productName,
          ISOLang.FR,
        );
        product.productType = ProductType.SIMPLE;

        if (attributeSet) {
          product.attributeSetId = attributeSet.id;
          product.attributeSet = attributeSet;
        }

        product.categories = productCategories;
        product.quantity = DEFAULT_PRODUCT_QUANTITY;

        await this._productRepository.save(product);
      }

      /**
       * 2. Create the product variant
       */

      const isVariantWithMagentoSKUExist =
        await this._productVariantRepository.findOne({
          where: {
            magentoId: magentoArticle.id,
          },
        });

      console.log(
        `Is variant with magentoId ${
          magentoArticle.id
        } exists === ${!!isVariantWithMagentoSKUExist}`,
      );

      if (!isVariantWithMagentoSKUExist) {
        const { productCategories, productCollections } =
          await this.getProductCategoriesAndCollections(
            magentoArticle.extension_attributes.category_links,
          );

        /**
         * 2.1 Get thumbnail and gallery
         */
        const magentoThumbnail = this.getVariantThumbnailURL(
          magentoArticle.media_gallery_entries,
          magentoArticle.custom_attributes,
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

        magentoArticle.media_gallery_entries.map((media) => {
          const { media_type, label, disabled, types, file, ...data } = media;

          if (
            !types.find((type) => type === MAGENTO_THUMBNAIL_ATTRIBUTE_CODE) &&
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
        const [attributeValuesData, unitsAdded] =
          await this.getVariantAttributeValues(
            magentoArticle.custom_attributes,
            units,
            magentoArticle.sku,
          );

        units.push(...unitsAdded);

        /**
         * 2.3 Get shortDescription, description, specialPrice, startDate, endDate
         */
        const shortDescriptionAttr = magentoArticle.custom_attributes.find(
          (customeAttr) =>
            customeAttr.attribute_code ===
            MAGENTO_PRODUCT_SHORT_DESCRIPTION_ATTRIBUTE_CODE,
        );

        const shortDescription = !!shortDescriptionAttr
          ? shortDescriptionAttr.value
          : null;

        const descriptionAttr = magentoArticle.custom_attributes.find(
          (customeAttr) =>
            customeAttr.attribute_code ===
            MAGENTO_PRODUCT_DESCRIPTION_ATTRIBUTE_CODE,
        );

        const description = !!descriptionAttr ? descriptionAttr.value : null;

        const specialPriceAttr = magentoArticle.custom_attributes.find(
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

        const startDateAttr = magentoArticle.custom_attributes.find(
          (customAttr) =>
            customAttr.attribute_code ===
            MAGENTO_PRODUCT_SPECIAL_PRICE_START_DATE_ATTRIBUTE_CODE,
        );

        const startDate = !!startDateAttr
          ? new Date(startDateAttr.value)
          : null;

        const endDateAttr = magentoArticle.custom_attributes.find(
          (customAttr) =>
            customAttr.attribute_code ===
            MAGENTO_PRODUCT_SPECIAL_PRICE_END_DATE_ATTRIBUTE_CODE,
        );

        const endDate = !!endDateAttr ? new Date(endDateAttr.value) : null;

        productVariant = new ProductVariant();

        productVariant.reference =
          await this._itemsReferenceService.generateVariantReference();
        productVariant.magentoId = magentoArticle.id;
        productVariant.shippingClass = await this.getVariantShippingClass(
          magentoArticle.custom_attributes,
        );
        productVariant.title = product.title;
        productVariant.shortDescription = this._sharedService.buildTStringValue(
          shortDescription,
          ISOLang.FR,
        );
        productVariant.description = this._sharedService.buildTStringValue(
          description,
          ISOLang.FR,
        );
        productVariant.quantity = DEFAULT_PRODUCT_QUANTITY;
        productVariant.salePrice = magentoArticle.price;
        productVariant.product = product;
        productVariant.productId = product.id;
        productVariant.magentoSKU = magentoArticle.sku;
        productVariant.sku = await this._productVariantSkuService.generateSKU(
          product,
          attributeValuesData,
        );

        productVariant.collections = productCollections;

        if (!!variantThumbnail) {
          productVariant.thumbnail = variantThumbnail;
        }

        if (!!variantGallery) {
          productVariant.gallery = variantGallery;
        }

        await this._productVariantRepository.save(productVariant);

        /**
         * If specialPrice, create a voucher and link to product variant
         */
        if (!!specialPrice) {
          const voucher = new Voucher();

          voucher.type = DiscountType.FIXED;
          voucher.value = specialPrice;
          voucher.startDate = startDate;
          voucher.endDate = endDate;

          await this._voucherRepository.save(voucher);

          productVariant.voucherId = voucher.id;
          productVariant.specialPrice = voucher;
        }

        /**
         * Create and save variant attribute values
         */
        const attributeValuesToAdd: ProductVariantAttributeValues<any>[] = [];

        attributeValuesData
          .filter((attrValue) => attrValue.attribute.id)
          .map(async (attrValue) => {
            const productVariantAttrValue =
              new ProductVariantAttributeValues<any>();

            if (attrValue.attribute.valueType === ValueType.COLOR) {
              console.log('Test color value ============ ', attrValue.value);
            }

            productVariantAttrValue.value = attrValue.value;
            productVariantAttrValue.attributeId = attrValue.attribute.id;
            productVariantAttrValue.attribute = attrValue.attribute;
            productVariantAttrValue.variantId = productVariant.id;
            productVariantAttrValue.productVariant = productVariant;

            if (attrValue.unit) {
              productVariantAttrValue.unit = attrValue.unit;
              productVariantAttrValue.unitId = attrValue.unit.id;
            }

            // attributeValuesToAdd.push(productVariantAttrValue);
            await this._productVariantAttrValuesRepository.save(
              productVariantAttrValue,
            );
          });

        // await this._productVariantAttrValuesRepository.save(
        //   attributeValuesToAdd,
        // );

        await this._productVariantRepository.save(productVariant);
      } else {
        productVariant = isVariantWithMagentoSKUExist;
      }

      const result: ProductCreatedFromImport = {
        product,
        variant: productVariant,
        units,
      };

      console.log('Result ============== ', result.variant?.reference);

      return result;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  async buildArticleOrdered(
    magentoArticleOrdered: MagentoArticleOrdered,
    position: number,
    order: Order,
    article: ProductVariant,
  ): Promise<ArticleOrdered> {
    const {
      product_id,
      sku,
      product_type,
      base_cost,
      price,
      qty_ordered,
      row_total,
      created_at,
      updated_at,
      // parent_item_price,
      // parent_row_total,
    } = magentoArticleOrdered;

    const articleOrdered = new ArticleOrdered();

    articleOrdered.quantity = qty_ordered;
    articleOrdered.status =
      order.orderStatus === StepStatus.TO_PICK_PACK
        ? StatusLine.TO_PICK_PACK
        : StatusLine.PACKED;
    articleOrdered.price = price;
    articleOrdered.productVariant = article;
    articleOrdered.productVariantId = article.id;
    articleOrdered.order = order;
    articleOrdered.orderId = order.id;
    articleOrdered.totalPrice = row_total;
    articleOrdered.position = position;
    const discount = await this._isArticleOrderedDiscount(price, article);
    if (discount.isVoucher) {
      articleOrdered.discount = discount.voucher.value;
    }

    await this._articleOrderedRepository.save(articleOrdered);

    return articleOrdered;
  }

  private async _isArticleOrderedDiscount(
    price: number,
    article: ProductVariant,
  ): Promise<{ voucher: Voucher; isVoucher: boolean }> {
    try {
      let voucher: Voucher;

      if (price < article.salePrice) {
        const discount = article.salePrice - price;

        voucher = new Voucher();

        voucher.type = DiscountType.FIXED;
        voucher.value = discount;

        await this._voucherRepository.save(voucher);
      }

      return {
        voucher,
        isVoucher: !!voucher,
      };
    } catch (error) {
      console.log(error);
    }
  }

  splitBundleSKU(sku: string): string[] {
    const skus: string[] = [];
    const parts = sku.split('-');
    let i = 0;
    parts.forEach((part) => {
      let sku: string;
      if (
        COLORS_VALUES.find(
          (color) => color.value.toLowerCase() === part.toLowerCase(),
        ) ||
        !part.match(/[a-zA-Z]/)
      ) {
        sku = `${parts[i - 1]}-${part}`;
      } else {
        sku = part;
      }

      skus.push(sku);
      i++;
    });

    return skus;
  }

  private _finalOperationsOnProductName(productName: string): string {
    let name = productName;

    const lastWord = productName.split(' ').pop();

    if (LAST_WORDS_TO_REMOVE.includes(lastWord.toLowerCase())) {
      name = name.replace(lastWord, '');
    }

    const lastCaracter = name.split(' ').pop();

    if (LAST_WORDS_TO_REMOVE.includes(lastCaracter.toLowerCase())) {
      name = name.replace(lastCaracter, '');
    }

    const endBy = name.slice(-1);

    if (LAST_WORDS_TO_REMOVE.includes(endBy)) {
      name = name.slice(0, -1);
    }

    return name;
  }

  private _getLabelFromOptions(
    value: string,
    options: MagentoAttributeOptionModel[],
  ): string {
    const option = options.find((option) => option.value === value);

    let label: string;

    if (option) {
      label = option.label;
    }

    return label;
  }

  private _getUnitAndValueFromLabel(
    label: string,
    attributeCode: string,
  ): DefinedAttributeValues {
    let attributeValue: DefinedAttributeValues;

    const options: MagentoAttributeOptionModel[] = [
      {
        label,
        value: null,
      },
    ];

    if (this._crawlEavService.isLabelContainsPlusSign(label)) {
      const newValue: any[] = [];
      let unit: DefinedUnitModel;

      label.split(PLUS_SIGN).map((item) => {
        newValue.push(item);

        if (this._crawlEavService.isOptionsWithPlusSignHasUnits(options)) {
          unit = this._crawlEavService.extractUnitsFromBatterieLabel(label)[0];
        } else {
          unit = this._crawlEavService.extractUnitFromLabel(label);
        }
      });

      attributeValue = {
        value: newValue,
        unit,
      };
    } else {
      if (this._crawlEavService.isOptionsWithoutPlusSignHasUnits(options)) {
        attributeValue = this._extractUnitAndValueFromLabel(
          label,
          attributeCode,
        );
      } else {
        attributeValue = {
          value: label,
        };
      }
    }

    attributeValue = {
      value: parseFloat(attributeValue.value),
      unit: attributeValue.unit,
    };

    return attributeValue;
  }

  private _extractUnitAndValueFromLabel(
    label: string,
    attributeCode: string,
  ): DefinedAttributeValues {
    let unit: DefinedUnitModel;

    if (attributeCode === SPECIAL_ATTRIBUTE_CODES.batterie_en_mah) {
      unit = this._crawlEavService.extractUnitsFromBatterieLabel(label)[0];
      // console.log(
      //   '\n\n************ TEST UNIT = ',
      //   unit,
      //   '****************\n\n',
      // );
    } else {
      unit = this._crawlEavService.extractUnitFromLabel(label);
    }

    const attributeValue: DefinedAttributeValues = {
      value: parseFloat(label),
      unit,
    };

    return attributeValue;
  }

  private async _createNewAttribute(
    magentoAttribute: MagentoAttributeModel,
  ): Promise<Attribute> {
    try {
      console.log(
        'Magento attribute: ',
        JSON.stringify(magentoAttribute, null, 2),
      );

      let attribute = new Attribute();
      const unitsAdded: Unit[] = [];

      attribute.magentoId = magentoAttribute.id;
      const attributeName =
        this._crawlEavService.removeUnnecessaryCharactersOnLabel(
          magentoAttribute.default_frontend_label,
        );
      attribute.name = this._sharedService.buildTStringValue(
        attributeName,
        ISOLang.FR,
      );

      if (
        magentoAttribute.frontend_input === FRONTEND_INPUTS.textarea ||
        magentoAttribute.frontend_input === FRONTEND_INPUTS.text
      ) {
        attribute.type = ATTRIBUTE_TYPE_MAPPING.find(
          (attributeType) =>
            attributeType.magento === magentoAttribute.backend_type,
        ).erp;
        attribute.valueType = ValueType.INPUT_FIELD;
        attribute.hasUnit = false;

        await this._attributeRepository.save(attribute);
        // attributesAdded.push(attribute);
      } else if (magentoAttribute.frontend_input === FRONTEND_INPUTS.boolean) {
        attribute.type = AttributeType.BOOLEAN;
        attribute.valueType = ValueType.YES_NO;
        attribute.hasUnit = false;

        await this._attributeRepository.save(attribute);
        // attributesAdded.push(attribute);
      } else if (
        magentoAttribute.attribute_code ===
        SPECIAL_ATTRIBUTE_CODES.batterie_en_mah
      ) {
        // create new attribute = batterie
        const attribute1 = new Attribute();

        attribute1.magentoId = magentoAttribute.id;
        const attribute1Name = this._crawlEavService
          .removeUnnecessaryCharactersOnLabel(
            magentoAttribute.default_frontend_label,
          )
          .replace('_', '')
          .trim();
        attribute1.name = this._sharedService.buildTStringValue(
          attribute1Name,
          ISOLang.FR,
        );
        attribute1.type = AttributeType.NUMBER;
        attribute1.valueType = ValueType.INPUT_FIELD;
        attribute1.hasUnit = true;
        const unitsToAdd =
          await this._crawlEavService.extractUnitsFromBatterieLabel(
            magentoAttribute.default_frontend_label,
          );

        attribute1.units = unitsToAdd;

        unitsAdded.push(...unitsToAdd);

        await this._attributeRepository.save(attribute1);
        attribute = attribute1;
        // attributesAdded.push(attribute1);

        // create new attribute = type de batterie
        const attribute2 = new Attribute();

        attribute2.magentoId = magentoAttribute.id;
        attribute2.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.typeDeBatterie,
          ISOLang.FR,
        );
        attribute2.type = AttributeType.STRING;
        attribute2.valueType = ValueType.DROPDOWN;
        attribute2.hasUnit = false;

        await this._attributeRepository.save(attribute2);

        // create definedAttributeValues
        const attributeValuesToAdd: AttributeValue[] = [];

        const definedAttrValues = HARD_ATTRIBUTES_DEFINED_VALUES.find(
          (item) => item.attribute === HARD_ATTRIBUTES.typeDeBatterie,
        ).values;

        if (definedAttrValues && definedAttrValues.length > 0) {
          await Promise.all(
            definedAttrValues.map(async (definedAttrValue) => {
              const attributeValue = new AttributeValue();

              const value: AttributeValueType = {
                value: definedAttrValue,
              };
              attributeValue.value = value;
              attributeValue.attribute = attribute2;
              attributeValue.attributeId = attribute2.id;

              await this._attributeValueRepository.save(attributeValue);

              attributeValuesToAdd.push(attributeValue);
            }),
          );

          await this._attributeValueRepository.save(attributeValuesToAdd);
        }

        attribute2.definedAttributeValues = attributeValuesToAdd;

        await this._attributeRepository.save(attribute2);
        attribute = attribute2;
        // attributesAdded.push(attribute2);
      } else if (
        magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.processeur
      ) {
        // create new attribute = ferequence processeur
        const attribute1 = new Attribute();

        attribute1.magentoId = magentoAttribute.id;
        attribute1.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.frequenceProcesseur,
          ISOLang.FR,
        );
        attribute1.type = AttributeType.NUMBER;
        attribute1.valueType = ValueType.INPUT_FIELD;
        attribute1.hasUnit = true;

        const unitsToAdd = await this._crawlEavService.getAttributeUnits(
          magentoAttribute,
        );
        attribute1.units = unitsToAdd;

        unitsAdded.push(...unitsToAdd);

        await this._attributeRepository.save(attribute1);

        attribute = attribute1;

        // attributesAdded.push(attribute1);

        // create new attribute = modele de processeur
        const attribute2 = new Attribute();

        attribute2.magentoId = magentoAttribute.id;
        attribute2.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.modeleProcesseur,
          ISOLang.FR,
        );
        attribute2.type = AttributeType.STRING;
        attribute2.valueType = ValueType.DROPDOWN;
        attribute2.hasUnit = false;

        await this._attributeRepository.save(attribute2);

        // create attribute values
        const attributeValuesToAdd2: AttributeValue[] = [];

        const definedAttrValues2 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
          (item) => item.attribute === HARD_ATTRIBUTES.modeleProcesseur,
        ).values;

        if (definedAttrValues2 && definedAttrValues2.length > 0) {
          definedAttrValues2.map((definedAttrValue) => {
            const attributeValue = new AttributeValue();

            const value: AttributeValueType = {
              value: definedAttrValue,
            };

            attributeValue.value = value;
            attributeValue.attribute = attribute2;
            attributeValue.attributeId = attribute2.id;

            attributeValuesToAdd2.push(attributeValue);
          });

          await this._attributeValueRepository.save(attributeValuesToAdd2);
        }

        attribute2.definedAttributeValues = attributeValuesToAdd2;

        await this._attributeRepository.save(attribute2);
        // attributesAdded.push(attribute2);
        attribute = attribute2;

        // create new attribute = gpu
        const attribute3 = new Attribute();

        attribute3.magentoId = magentoAttribute.id;
        attribute3.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.gpu,
          ISOLang.FR,
        );
        attribute3.type = AttributeType.STRING;
        attribute3.valueType = ValueType.DROPDOWN;
        attribute3.hasUnit = false;

        await this._attributeRepository.save(attribute3);

        // create defined attributes values
        const attributeValuesToAdd3: AttributeValue[] = [];

        const definedAttrValues3 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
          (item) => item.attribute === HARD_ATTRIBUTES.gpu,
        ).values;

        if (definedAttrValues3 && definedAttrValues3.length > 0) {
          definedAttrValues3.map((definedAttrValue) => {
            const attributeValue = new AttributeValue();

            const value: AttributeValueType = {
              value: definedAttrValue,
            };

            attributeValue.value = value;
            attributeValue.attribute = attribute3;
            attributeValue.attributeId = attribute3.id;

            attributeValuesToAdd3.push(attributeValue);
          });

          await this._attributeValueRepository.save(attributeValuesToAdd3);
        }

        attribute3.definedAttributeValues = attributeValuesToAdd3;

        await this._attributeRepository.save(attribute3);
        // attributesAdded.push(attribute3);
        attribute = attribute3;

        // create new attribute = soc
        const attribute4 = new Attribute();

        attribute4.magentoId = magentoAttribute.id;
        attribute4.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.soc,
          ISOLang.FR,
        );
        attribute4.type = AttributeType.STRING;
        attribute4.valueType = ValueType.DROPDOWN;
        attribute4.hasUnit = false;

        await this._attributeRepository.save(attribute4);

        // create defined attributes values
        const attributeValuesToAdd4: AttributeValue[] = [];

        const definedAttrValues4 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
          (item) => item.attribute === HARD_ATTRIBUTES.soc,
        ).values;

        if (definedAttrValues4 && definedAttrValues4.length > 0) {
          definedAttrValues4.map((definedAttrValue) => {
            const attributeValue = new AttributeValue();

            const value: AttributeValueType = {
              value: definedAttrValue,
            };

            attributeValue.value = value;
            attributeValue.attribute = attribute4;
            attributeValue.attributeId = attribute4.id;

            attributeValuesToAdd4.push(attributeValue);
          });

          await this._attributeValueRepository.save(attributeValuesToAdd4);
        }

        attribute4.definedAttributeValues = attributeValuesToAdd4;
        await this._attributeRepository.save(attribute4);

        // attributesAdded.push(attribute4);
        attribute = attribute4;

        // create new attribute = version android
        const attribute5 = new Attribute();

        attribute5.magentoId = magentoAttribute.id;
        attribute5.name = this._sharedService.buildTStringValue(
          HARD_ATTRIBUTES.versionAndroid,
          ISOLang.FR,
        );
        attribute5.type = AttributeType.NUMBER;
        attribute5.valueType = ValueType.INPUT_FIELD;
        attribute5.hasUnit = false;

        await this._attributeRepository.save(attribute5);

        // attributesAdded.push(attribute5);
        attribute = attribute5;
      } else if (
        magentoAttribute.frontend_input === FRONTEND_INPUTS.select ||
        magentoAttribute.frontend_input === FRONTEND_INPUTS.multiselect
      ) {
        const attributeData =
          await this._crawlEavService.definedSelectAttribute(magentoAttribute);

        const { type, valueType, hasUnit, definedAttributeValues, units } =
          attributeData;

        if (attribute.hasUnit) {
          // Just push new units and save
          if (units && units.length > 0) {
            attribute.units.push(...units);
          }
        } else {
          // Create the new attribute
          attribute.units = units;
        }

        attribute.type = type;
        attribute.valueType = valueType;
        attribute.hasUnit = hasUnit;

        await this._attributeRepository.save(attribute);

        // create default attributes values
        if (definedAttributeValues && definedAttributeValues.length > 0) {
          const definedAttributeValuesToAdd: AttributeValue[] = [];

          await Promise.all(
            definedAttributeValues.map(async (definedAttrValue) => {
              const { value, code, unit } = definedAttrValue;

              const attributeValue = new AttributeValue();
              let unitToAdd: Unit;

              if (!!unit) {
                const allUnits = await this._unitRepository.find();

                if (
                  !allUnits.find(
                    (unit) =>
                      unit.symbol.toLowerCase() === unit.symbol.toLowerCase(),
                  )
                ) {
                  const newUnit = new Unit();

                  newUnit.title = this._sharedService.buildTStringValue(
                    unit.title,
                    ISOLang.FR,
                  );
                  newUnit.symbol = unit.symbol;

                  await this._unitRepository.save(newUnit);
                  unitToAdd = newUnit;

                  unitsAdded.push(newUnit);
                }
              }

              if (unitToAdd) {
                attributeValue.unit = unitToAdd;
                attributeValue.unitId = unitToAdd.id;
              }

              const valueToAdd: AttributeValueType = {
                code: code ? code : null,
                value: value,
                unitId: unitToAdd ? unitToAdd.id : null,
              };
              attributeValue.value = valueToAdd;
              attributeValue.attribute = attribute;
              attributeValue.attributeId = attribute.id;

              definedAttributeValuesToAdd.push(attributeValue);
            }),
          );

          attribute.definedAttributeValues = definedAttributeValuesToAdd;
          await this._attributeRepository.save(attribute);
        }

        // attributesAdded.push(attribute);
      } else {
        console.log('**** THIS MAY NOT APPEND ****');
      }

      await this._unitRepository.save(unitsAdded);

      console.log('Attribute added: ', attribute);

      return attribute;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }
}
