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
  MAGENTO_USER_TOKEN,
} from 'src/domain/constants';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { Unit } from 'src/domain/entities/items/eav';
import { CrawlActivity } from 'src/domain/entities/magento';
import { CrawlResult, CrawlType } from 'src/domain/enums/magento';
import { MagentoArticleModel } from 'src/domain/interfaces/magento';
import { UnitRepository } from 'src/repositories/items';
import { CrawlActivityRepository } from 'src/repositories/magento';
import { CrawlArticlesService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ImportArticlesOutput } from 'src/domain/dto/magento';

type ValidationResult = {
  pageSize: number;
  currentPage: number;
};

@Injectable()
export class ImportArticlesService {
  constructor(
    @InjectRepository(CrawlActivity)
    private readonly _crawlActivityRepository: CrawlActivityRepository,
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    private readonly _httpService: HttpService,
    private readonly _crawlArticleService: CrawlArticlesService,
    private readonly _sharedService: SharedService,
  ) {}

  async importArticles(): Promise<ImportArticlesOutput> {
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
      let { pageSize, currentPage } = result;

      /**
       * Get magento articles
       */
      let magentoArticles: MagentoArticleModel[] = [];

      const symbols: string[] = [];

      const unitsFromDB = await this._unitRepository.find();
      unitsFromDB.map((unit) => symbols.push(unit.symbol));

      /**
       * Start loop to get articles
       */
      let totalCount = 0;
      let totalPages = 0;
      let myCurrentPage = currentPage;

      do {
        const path =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(GET_PRODUCTS, {
            pageSize,
            currentPage: myCurrentPage,
          });

        console.log(path);

        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            totalCount = response.data.total_count;

            totalPages = Math.ceil(totalCount / pageSize);

            if (response.data.items.length > 0) {
              if (response.data.items.length >= pageSize) currentPage++;

              response.data.items.map((item) => {
                const magentoArticle: MagentoArticleModel = {
                  ...item,
                  pageSize,
                  currentPage,
                  totalPages,
                };

                magentoArticles.push(magentoArticle);
              });
            }

            // console.log(response.data.items);
            myCurrentPage++;

            /**
             * clean magento articles
             */
            //TODO: check visibility
            magentoArticles = magentoArticles.filter(
              (article) => article.status === 1,
            );

            console.log(
              `${magentoArticles.length} on ${totalCount} imported...`,
            );

            // console.log(`CurrentPage = ${currentPage} and MyCurrentPage = ${myCurrentPage} and totalPages = ${totalPages}`);
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}. ${error}`,
            );
          });
      } while (myCurrentPage < totalPages + 1);
      // } while (myCurrentPage < 2);

      if (myCurrentPage === totalPages + 1) {
        console.log(`End: ${magentoArticles.length} articles imported`);
      }

      if (totalCount / pageSize < myCurrentPage) {
        const crawlsToDelete = await this._crawlActivityRepository.find({
          where: {
            action: CrawlType.IMPORT_CRAWL,
            entity: ProductVariant.name,
          },
        });

        if (crawlsToDelete && crawlsToDelete.length > 0) {
          crawlsToDelete.forEach((crawlToDelete) =>
            this._crawlActivityRepository.delete(crawlToDelete.id),
          );
        }

        currentPage = CRAWL_DEFAULT_CURRENT_PAGE_FOR_ARTICLES;
      }

      /**
       * Build productNames, simpleProducts,
       * bundledProducts and groupedProducts
       */
      const productNames: string[] = [];
      const productSKUs: string[] = [];
      const simpleProducts: MagentoArticleModel[] = [];
      const bundleProducts: MagentoArticleModel[] = [];
      const groupedProducts: MagentoArticleModel[] = [];

      magentoArticles.map((article) => {
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

      const products: Product[] = [];
      const variants: ProductVariant[] = [];
      const units: Unit[] = [];

      /**
       * Loop through simpleProducts
       * *** 1. Create Product if not exist and push on products
       * ***  or get product from ERP
       * *** 2. Create Variant
       * ******* Loop through magentoArticle.custom_attributes as attribute
       * *********** If attribute is not present in invalidAttributes[]
       * *************** 3. Get attribute by attributeCode from magento API
       * *************** If attribute.is_user_defined = true
       * ****************** If attribute exist in ERP:
       * ********************* 4. Get attribute by id from ERP
       */
      console.log('1. CREATE PRODUCTS');

      for (const simpleProduct of simpleProducts) {
        const simpleProductCreated =
          await this._crawlArticleService.createSimpleProduct(
            simpleProduct,
            productNamesPatterns,
            symbols,
            units,
          );

        products.push(simpleProductCreated.product);
        units.push(...simpleProductCreated.units);
        if (!!simpleProductCreated.variant) {
          variants.push(simpleProductCreated.variant);
        }

        if (variants.length > 0) {
          /**
           * Add new CrawlActivity
           */
          const crawlActivities = await this._crawlActivityRepository.find({
            where: {
              action: CrawlType.IMPORT_CRAWL,
              entity: ProductVariant.name,
            },
            order: { createdAt: 'DESC' },
            skip: 0,
            take: 1,
          });

          console.log(crawlActivities);

          const crawls = crawlActivities.filter(
            (crawl) => crawl.result === CrawlResult.SUCCESS,
          );

          if (crawls && crawls.length > 0) {
            if (simpleProduct.currentPage > crawls[0].currentPage) {
              const crawlActivity = new CrawlActivity();

              crawlActivity.action = CrawlType.IMPORT_CRAWL;
              crawlActivity.entity = ProductVariant.name;
              crawlActivity.pageSize = simpleProduct.pageSize;
              crawlActivity.currentPage = simpleProduct.currentPage;
              crawlActivity.totalCount = simpleProduct.totalCount;
              crawlActivity.result = CrawlResult.SUCCESS;

              await this._crawlActivityRepository.save(crawlActivity);
            }
          } else {
            const crawlActivity = new CrawlActivity();

            crawlActivity.action = CrawlType.IMPORT_CRAWL;
            crawlActivity.entity = ProductVariant.name;
            crawlActivity.pageSize = simpleProduct.pageSize;
            crawlActivity.currentPage = simpleProduct.currentPage;
            crawlActivity.totalCount = simpleProduct.totalCount;
            crawlActivity.result = CrawlResult.SUCCESS;

            await this._crawlActivityRepository.save(crawlActivity);
          }
        }
      }

      for (const bundleProduct of bundleProducts) {
        const bundleProductCreated =
          await this._crawlArticleService.createBundleProduct(
            bundleProduct,
            productNamesPatterns,
            symbols,
          );

        products.push(bundleProductCreated.product);
        if (!!bundleProductCreated.variant) {
          variants.push(bundleProductCreated.variant);
        }

        if (variants.length > 0) {
          /**
           * Add new CrawlActivity
           */
          const crawlActivities = await this._crawlActivityRepository.find({
            where: {
              action: CrawlType.IMPORT_CRAWL,
              entity: ProductVariant.name,
            },
            order: { createdAt: 'DESC' },
            skip: 0,
            take: 1,
          });

          const crawls = crawlActivities.filter(
            (crawl) => crawl.result === CrawlResult.SUCCESS,
          );

          if (crawls && crawls.length > 0) {
            if (bundleProduct.currentPage > crawls[0].currentPage) {
              const crawlActivity = new CrawlActivity();

              crawlActivity.action = CrawlType.IMPORT_CRAWL;
              crawlActivity.entity = ProductVariant.name;
              crawlActivity.pageSize = bundleProduct.pageSize;
              crawlActivity.currentPage = bundleProduct.currentPage;
              crawlActivity.totalCount = bundleProduct.totalCount;
              crawlActivity.result = CrawlResult.SUCCESS;

              await this._crawlActivityRepository.save(crawlActivity);
            }
          } else {
            const crawlActivity = new CrawlActivity();

            crawlActivity.action = CrawlType.IMPORT_CRAWL;
            crawlActivity.entity = ProductVariant.name;
            crawlActivity.pageSize = bundleProduct.pageSize;
            crawlActivity.currentPage = bundleProduct.currentPage;
            crawlActivity.totalCount = bundleProduct.totalCount;
            crawlActivity.result = CrawlResult.SUCCESS;

            await this._crawlActivityRepository.save(crawlActivity);
          }
        }
      }

      for (const groupedProduct of groupedProducts) {
      }

      /**
       * Create a new CrawlActivity
       */
      const crawlActivity = new CrawlActivity();

      crawlActivity.action = CrawlType.IMPORT_CRAWL;
      crawlActivity.entity = ProductVariant.name;
      crawlActivity.pageSize = pageSize;
      crawlActivity.currentPage = currentPage;
      crawlActivity.totalCount = totalCount;
      crawlActivity.result = CrawlResult.SUCCESS;

      await this._crawlActivityRepository.save(crawlActivity);

      console.log('****** PRODUCTS ADDED = ', products.length);
      console.log('****** VARIANTS ADDED = ', variants.length);
      console.log('****** UNITS ADDED = ', units.length);

      return new ImportArticlesOutput(
        products.length,
        variants.length,
        units.length,
      );
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ImportArticlesService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(): Promise<ValidationResult> {
    try {
      let pageSize: number = CRAWL_DEFAULT_PAGE_SIZE_FOR_ARTICLES;
      let currentPage: number = CRAWL_DEFAULT_CURRENT_PAGE_FOR_ARTICLES;

      let crawls = await this._crawlActivityRepository.find({
        where: {
          action: CrawlType.IMPORT_CRAWL,
          entity: ProductVariant.name,
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 1,
      });

      crawls = crawls.filter((crawl) => crawl.result === CrawlResult.SUCCESS);

      if (crawls && crawls.length > 0) {
        pageSize = crawls[0].pageSize;
        currentPage = crawls[0].currentPage;
      }

      console.log(pageSize, currentPage);

      return { pageSize, currentPage };
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ImportArticlesService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private _changePosition(
    newPosition: number,
    originalStr: string,
    subStr: string,
  ): string {
    let newStr: string = originalStr;

    if (originalStr.includes(subStr)) {
      newStr = originalStr.replace(subStr, '');

      const part_1 = newStr.slice(0, newPosition);
      const part_2 = newStr.slice(newPosition + 1, newStr.length);

      newStr = `${part_1} ${subStr} ${part_2}`;
    }

    return newStr;
  }
}
