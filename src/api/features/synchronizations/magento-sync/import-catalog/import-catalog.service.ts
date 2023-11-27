import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionType, ISOLang, Status } from '@glosuite/shared';
import {
  CRAWL_DEFAULT_CURRENT_PAGE_FOR_CATALOG,
  CRAWL_DEFAULT_PAGE_SIZE_FOR_CATALOG,
  DEFAULT_CATEGORY_PATH,
  GET_CATEGORIES_FLAT,
  MAGENTO_BASE_API_URL,
  MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
  MAGENTO_USER_TOKEN,
} from 'src/domain/constants';
import { CrawlActivity } from 'src/domain/entities/magento';
import { Category, Collection } from 'src/domain/entities/structures';
import { CrawlResult, CrawlType } from 'src/domain/enums/magento';
import { MagentoCategoryModel } from 'src/domain/interfaces/magento/i.magento-category.model';
import { CrawlActivityRepository } from 'src/repositories/magento';
import {
  CategoryRepository,
  CollectionRepository,
} from 'src/repositories/structures';
import { CategoryService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ImportCatalogOutput } from 'src/domain/dto/magento';

type ValidationResult = {
  pageSize: number;
  currentPage: number;
};

@Injectable()
export class ImportCatalogService {
  constructor(
    @InjectRepository(CrawlActivity)
    private readonly _crawlActivityRepository: CrawlActivityRepository,
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Collection)
    private readonly _collectionRepository: CollectionRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
    private readonly _categoryService: CategoryService,
  ) {}

  async importCatalog(): Promise<ImportCatalogOutput> {
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
  ): Promise<ImportCatalogOutput> {
    try {
      // let { pageSize, currentPage } = result;
      let currentPage = result.currentPage;
      const pageSize = result.pageSize;

      const magentoCategories: MagentoCategoryModel[] = [];
      const magentoCollections: MagentoCategoryModel[] = [];

      let totalCount = 0;
      let totalPages = 0;
      let myCurrentPage = currentPage;

      do {
        const path =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(GET_CATEGORIES_FLAT, {
            pageSize,
            currentPage: myCurrentPage,
          });

        console.log(path);

        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            response.data.items.map((item) => {
              if (this._isCategoryOrCollectionActive(item.path)) {
                if (this._isItemIsCategory(item.level, item.include_in_menu)) {
                  magentoCategories.push({
                    id: item.id,
                    parent_id: item.parent_id,
                    name: item.name,
                    is_active: item.is_active,
                    level: item.level,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    path: item.path,
                    pathArray: path.split('/'),
                    children:
                      item.children === '' ? [] : item.children.split(','),
                    include_in_menu: item.include_in_menu,
                    custom_attributes: item.custom_attributes,
                  });
                } else {
                  magentoCollections.push({
                    id: item.id,
                    parent_id: item.parent_id,
                    name: item.name,
                    is_active: item.is_active,
                    level: item.level,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    path: item.path,
                    pathArray: path.split('/'),
                    children:
                      item.children === '' ? [] : item.children.split(','),
                    include_in_menu: item.include_in_menu,
                    custom_attributes: item.custom_attributes,
                  });
                }
              }
            });

            totalCount = response.data.total_count;

            totalPages = Math.ceil(totalCount / pageSize);

            myCurrentPage++;

            if (response.data.items.length >= pageSize) currentPage++;

            console.log(
              `${magentoCategories.length} categories imported on ${totalCount}...`,
            );
            console.log(
              `${magentoCollections.length} collections imported on ${totalCount}...`,
            );
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}`,
            );
          });
      } while (myCurrentPage < totalPages + 1);

      if (myCurrentPage === totalPages + 1) {
        console.log('End:');
        console.log(`${magentoCategories.length} categories imported`);
        console.log(`${magentoCollections.length} collections imported`);
      }

      /**
       * 1. CREATE CATEGORIES IF NOT EXISTS
       */
      console.log('1. CREATE CATEGORIES IF NOT EXISTS');

      const categoriesAdded: Category[] = [];

      if (magentoCategories && magentoCategories.length > 0) {
        await Promise.all(
          magentoCategories.map(async (magentoCategory) => {
            const {
              id,
              parent_id,
              name,
              is_active,
              level,
              created_at,
              updated_at,
              path,
              pathArray,
              children,
              include_in_menu,
              custom_attributes,
            } = magentoCategory;

            let categoryExist = await this._categoryRepository.findOne({
              where: {
                magentoId: id,
              },
            });

            if (!categoryExist) {
              categoryExist = new Category();

              categoryExist.magentoId = id;
              categoryExist.title = this._sharedService.buildTStringValue(
                name,
                ISOLang.FR,
              );
              const descriptionAttr = custom_attributes.find(
                (customAttr) =>
                  customAttr.attribute_code ===
                  MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
              );
              if (!!descriptionAttr) {
                categoryExist.description =
                  this._sharedService.buildTStringValue(
                    descriptionAttr.value,
                    ISOLang.FR,
                  );
              }
              categoryExist.status = is_active
                ? Status.ENABLED
                : Status.DISABLED;
              categoryExist.symbol =
                await this._categoryService.generateCategorySumbol(name);
              categoryExist.magentoCreatedAt = new Date(created_at);
              categoryExist.magentoUpdatedAt = new Date(updated_at);

              await this._categoryRepository.save(categoryExist);

              categoriesAdded.push(categoryExist);
            }
          }),
        );
      }

      await Promise.all(
        magentoCategories.map(async (magentoCategory) => {
          const category = await this._categoryRepository.findOne({
            where: {
              magentoId: magentoCategory.id,
            },
          });

          if (category) {
            const parentCategory = await this._categoryRepository.findOne({
              where: {
                magentoId: magentoCategory.parent_id,
              },
            });
            if (parentCategory) {
              category.parentCategory = parentCategory;
            }

            await this._categoryRepository.save(category);
          }
        }),
      );

      /**
       * 2. CREATE COLLECTIONS IF NOT EXISTS
       */
      console.log('2. CREATE COLLECTIONS IF NOT EXISTS');

      const collectionsAdded: Collection[] = [];

      if (magentoCollections && magentoCollections.length > 0) {
        await Promise.all(
          magentoCollections.map(async (magentoCollection) => {
            const {
              id,
              parent_id,
              name,
              is_active,
              level,
              created_at,
              updated_at,
              path,
              pathArray,
              children,
              include_in_menu,
              custom_attributes,
            } = magentoCollection;

            let collectionExist = await this._collectionRepository.findOne({
              where: {
                magentoId: id,
              },
            });

            if (!collectionExist) {
              collectionExist = new Collection();

              collectionExist.magentoId = id;
              collectionExist.title = this._sharedService.buildTStringValue(
                name,
                ISOLang.FR,
              );
              const descriptionAttr = custom_attributes.find(
                (customAttr) =>
                  customAttr.attribute_code ===
                  MAGENTO_CATEGORY_DESCRIPTION_ATTRIVUTE_CODE,
              );
              if (!!descriptionAttr) {
                collectionExist.description =
                  this._sharedService.buildTStringValue(
                    descriptionAttr.value,
                    ISOLang.FR,
                  );
              }
              collectionExist.status = is_active
                ? Status.ENABLED
                : Status.DISABLED;
              collectionExist.collectionType = CollectionType.DEFAULT;
              collectionExist.magentoCreatedAt = new Date(created_at);
              collectionExist.magentoUpdatedAt = new Date(updated_at);

              await this._collectionRepository.save(collectionExist);

              collectionsAdded.push(collectionExist);
            }
          }),
        );

        await Promise.all(
          magentoCollections.map(async (magetoCollection) => {
            const collection = await this._collectionRepository.findOne({
              where: {
                magentoId: magetoCollection.id,
              },
            });

            if (collection) {
              const parentCollection = await this._collectionRepository.findOne(
                { where: { magentoId: magetoCollection.parent_id } },
              );
              if (parentCollection) {
                collection.parentCollection = parentCollection;
              }

              await this._collectionRepository.save(collection);
            }
          }),
        );
      }

      /**
       * Add newn CrawlActivity
       */
      const crawlActivity = new CrawlActivity();

      crawlActivity.action = CrawlType.IMPORT_CRAWL;
      crawlActivity.entity = Category.name;
      crawlActivity.pageSize = pageSize;
      crawlActivity.currentPage = currentPage;
      crawlActivity.totalCount = totalCount;
      crawlActivity.result = CrawlResult.SUCCESS;

      await this._crawlActivityRepository.save(crawlActivity);

      console.log('****** CATEGORIES ADDED = ', categoriesAdded.length);
      console.log('****** COLLECTIONS ADDED = ', collectionsAdded.length);

      return new ImportCatalogOutput(
        categoriesAdded.length,
        collectionsAdded.length,
      );
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ImportCatalogService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(): Promise<ValidationResult> {
    try {
      let pageSize: number = CRAWL_DEFAULT_PAGE_SIZE_FOR_CATALOG;
      let currentPage: number = CRAWL_DEFAULT_CURRENT_PAGE_FOR_CATALOG;

      let crawls = await this._crawlActivityRepository.find({
        where: {
          action: CrawlType.IMPORT_CRAWL,
          entity: Category.name,
        },
        order: { createdAt: 'DESC' },
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
        `${ImportCatalogService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private _isCategoryOrCollectionActive(path: string): boolean {
    if (path.slice(0, 4) === DEFAULT_CATEGORY_PATH) {
      return true;
    }

    return false;
  }

  private _isItemIsCategory(level: number, include_in_menu: boolean): boolean {
    if (level >= 4 || (include_in_menu && level < 4)) {
      return true;
    }

    return false;
  }
}
