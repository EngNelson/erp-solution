import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CATALOG_SYNC_TIMEOUT,
  GET_PRODUCTS,
  MAGENTO_BASE_API_URL,
  MAGENTO_USER_TOKEN,
  SYNC_MAGENTO_CATALOG,
} from 'src/domain/constants';
import { Product, ProductVariant } from 'src/domain/entities/items';
import { Unit } from 'src/domain/entities/items/eav';
import { SynchronizationHistory } from 'src/domain/entities/magento';
import { AllowAction, CrawlResult, SyncType } from 'src/domain/enums/magento';
import {
  MagentoArticleModel,
  SyncHistoryModel,
} from 'src/domain/interfaces/magento';
import { UnitRepository } from 'src/repositories/items';
import { SynchronizationHistoryRepository } from 'src/repositories/magento';
import { CrawlArticlesService } from 'src/services/generals';
import { SharedService, SyncConfigs } from 'src/services/utilities';

@Injectable()
export class SyncCatalogService {
  private readonly logger = new Logger(SyncCatalogService.name);

  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(SynchronizationHistory)
    private readonly _synchronizationHistoryRepository: SynchronizationHistoryRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _crawlArticleService: CrawlArticlesService,
    private readonly _syncConfigs: SyncConfigs,
  ) {}

  @Cron(new SyncConfigs().setCronTimeout(CATALOG_SYNC_TIMEOUT))
  async getProducts() {
    if (SYNC_MAGENTO_CATALOG === AllowAction.OFF) {
      console.log('MAGENTO CATALOG SYNCHRONIZATION IS DISABLED');
      return;
    }

    console.log(
      this._syncConfigs.startingMessage(CATALOG_SYNC_TIMEOUT, SyncType.CATALOG),
    );

    const magentoArticles: MagentoArticleModel[] = [];
    const symbols: string[] = [];

    const unitsFromDB = await this._unitRepository.find();
    unitsFromDB.map((unit) => symbols.push(unit.symbol));

    let syncHistory = await this._synchronizationHistoryRepository.findOne({
      where: { entity: ProductVariant.name },
    });

    const params =
      this._sharedService.buildMagentoCataloSyncgURLCriteria(syncHistory);

    const path =
      MAGENTO_BASE_API_URL +
      this._sharedService.buildURL(
        GET_PRODUCTS,
        params.pagination,
        null,
        params.filters,
      );

    console.log(path);
    let status: CrawlResult;

    await this._httpService
      .axiosRef(path, {
        headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
      })
      .then((response) => {
        status = CrawlResult.SUCCESS;
        const totalImport = response.data.items.length;

        if (totalImport > 0) {
          response.data.items.map((item) => {
            const magentoArticle: MagentoArticleModel = { ...item };

            // console.log(magentoArticle);

            magentoArticles.push(magentoArticle);
          });
        }
      })
      .catch((error) => {
        status = CrawlResult.FAILURE;
        console.log(
          `${error.syscall} - ${error.code} : errno = ${error.errno} : ${error}`,
        );
      });

    console.log(`${magentoArticles.length} article(s) imported from Magento.`);

    // Update the synchronization history
    const history: SyncHistoryModel = {
      status:
        status === CrawlResult.SUCCESS
          ? CrawlResult.SUCCESS
          : CrawlResult.FAILURE,
      importedItems: magentoArticles.length,
      minutes: CATALOG_SYNC_TIMEOUT,
      createdAt: new Date(),
    };

    if (!syncHistory) {
      syncHistory = new SynchronizationHistory();

      syncHistory.history = history;
      syncHistory.entity = ProductVariant.name;
      syncHistory.times = status === CrawlResult.SUCCESS ? 0 : 1;
    } else {
      syncHistory.times =
        status === CrawlResult.SUCCESS ? 0 : syncHistory.times + 1;
      syncHistory.history = history;
      syncHistory.lastStatus =
        status === CrawlResult.SUCCESS
          ? CrawlResult.SUCCESS
          : CrawlResult.FAILURE;
    }

    await this._synchronizationHistoryRepository.save(syncHistory);

    /**
     * Data treatment
     */
    const productNames: string[] = [];
    const productSKUs: string[] = [];
    const simpleProducts: MagentoArticleModel[] = [];
    const bundleProducts: MagentoArticleModel[] = [];
    const groupedProducts: MagentoArticleModel[] = [];

    magentoArticles.forEach((article) => {
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
      variants.push(simpleProductCreated.variant);
    }

    for (const bundleProduct of bundleProducts) {
      const bundleProductCreated =
        await this._crawlArticleService.createBundleProduct(
          bundleProduct,
          productNamesPatterns,
          symbols,
        );

      products.push(bundleProductCreated.product);
      variants.push(bundleProductCreated.variant);
    }

    for (const groupedProduct of groupedProducts) {
    }

    console.log('****** PRODUCTS ADDED = ', products.length);
    console.log('****** VARIANTS ADDED = ', variants.length);
    console.log('****** UNITS ADDED = ', units.length);
  }
}
