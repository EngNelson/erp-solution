import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, UserCon } from '@glosuite/shared';
import { CategoryItemOutput } from 'src/domain/dto/structures';
import { Category } from 'src/domain/entities/structures';
import { CategoryRepository } from 'src/repositories/structures';
import { EditCategoryInput } from './dto';

type ValidationResult = {
  parentCategory: Category;
  category: Category;
  subCategories: Category[];
  parentCategoryChanged: boolean;
  subCategoriesChanged: boolean;
  addInStatistics: boolean;
  lang: ISOLang;
  user: UserCon;
};

@Injectable()
export class EditCategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
  ) {}

  async editCategory(
    input: EditCategoryInput,
    user: UserCon,
  ): Promise<CategoryItemOutput> {
    const validationResult = await this._tryValidation(input, user);

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
    input: EditCategoryInput,
    validationResult: ValidationResult,
  ): Promise<CategoryItemOutput> {
    try {
      const {
        parentCategory,
        category,
        subCategories,
        parentCategoryChanged,
        subCategoriesChanged,
        addInStatistics,
        lang,
        user,
      } = validationResult;

      if (input.title) {
        const inputLangs = Object.keys(input.title);
        inputLangs.map((inputLang) => {
          category.title[inputLang] = input.title[inputLang];
        });
      }

      if (input.description) {
        if (!category.description) {
          category.description = input.description;
        } else {
          const inputLangs = Object.keys(input.description);
          inputLangs.map((inputLang) => {
            category.description[inputLang] = input.description[inputLang];
          });
        }
      }

      if (!isNullOrWhiteSpace(input.symbol)) {
        category.symbol = input.symbol;
      }

      if (parentCategoryChanged) {
        category.parentCategory = parentCategory;
      }

      if (subCategoriesChanged) {
        const subCategoriesToUpdate: Category[] = [];

        subCategories.map((subCat) => {
          subCat.parentCategory = category;

          subCategoriesToUpdate.push(subCat);
        });

        await this._categoryRepository.save(subCategoriesToUpdate);
      }

      if (input.addInStatistics) {
        category.addInStatistics = addInStatistics;
      }

      category.updatedBy = user;

      await this._categoryRepository.save(category);

      return new CategoryItemOutput(category, lang);
    } catch (error) {
      throw new BadRequestException(
        `${EditCategoryService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EditCategoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      const category = await this._categoryRepository.findOne({
        where: { id: input.categoryId },
        relations: ['parentCategory', 'collections', 'subCategories'],
      });

      if (!category) {
        throw new NotFoundException(
          `Category with id '${input.categoryId}' not found test`,
        );
      }

      let parentCategory: Category;
      let subCategories: Category[];

      if (!isNullOrWhiteSpace(input.parentCategoryId)) {
        parentCategory = await this._categoryRepository.findOne({
          where: { id: input.parentCategoryId },
        });

        if (!parentCategory) {
          throw new NotFoundException(
            `Parent Category with id '${input.parentCategoryId}' not found`,
          );
        }
      }

      if (input.subCategoriesIds && input.subCategoriesIds.length > 0) {
        subCategories = await this._categoryRepository.findByIds(
          input.subCategoriesIds,
        );
        if (subCategories.length !== input.subCategoriesIds.length) {
          throw new NotFoundException(
            `Some subcategories among ids: '${input.subCategoriesIds}' are not found`,
          );
        }

        subCategories.map((subCat) => {
          if (subCat.parentCategory && subCat.parentCategory !== category) {
            throw new HttpException(
              `The category '${subCat.title[lang]}' already have a parent category`,
              HttpStatus.CONFLICT,
            );
          }
        });
      }

      const addInStatistics = input.addInStatistics === 1 ? true : false;

      return {
        parentCategory,
        subCategories,
        category,
        parentCategoryChanged: !!parentCategory,
        subCategoriesChanged: !!subCategories,
        addInStatistics,
        lang,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${EditCategoryService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error.response,
      );
    }
  }
}
