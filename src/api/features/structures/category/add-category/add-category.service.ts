import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getLangOrFirstAvailableValue,
  isNullOrWhiteSpace,
  ISOLang,
  Status,
  UserCon,
} from '@glosuite/shared';
import { CategoryItemOutput } from 'src/domain/dto/structures';
import { Category } from 'src/domain/entities/structures';
import { CategoryRepository } from 'src/repositories/structures';
import { AddCategoryInput } from './dto';

type ValidationResult = {
  parentCategory: Category;
  subCategories: Category[];
  isParentCategory: boolean;
  isSubCategories: boolean;
  lang: ISOLang;
};

@Injectable()
export class AddCategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
  ) {}

  async addCategory(
    input: AddCategoryInput,
    user: UserCon,
  ): Promise<CategoryItemOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(
      input,
      validationResult,
      user,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: AddCategoryInput,
    validationResult: ValidationResult,
    user: UserCon,
  ): Promise<CategoryItemOutput> {
    const category = new Category();

    try {
      const {
        parentCategory,
        subCategories,
        isParentCategory,
        isSubCategories,
        lang,
      } = validationResult;

      category.title = input.title;
      category.description = input.description;
      category.status = input.status ? input.status : Status.ENABLED;
      category.addInStatistics = input.addInStatistics;
      category.symbol = input.symbol;
      category.createdBy = user;

      if (isParentCategory) {
        category.parentCategory = parentCategory;
      }

      await this._categoryRepository.save(category);

      if (isSubCategories) {
        const subCategoriesToUpdate: Category[] = [];

        subCategories.forEach((subCat) => {
          subCat.parentCategory = category;

          subCategoriesToUpdate.push(subCat);
        });

        await this._categoryRepository.save(subCategoriesToUpdate);
      }

      const cat: Category = await this._categoryRepository.findOne({
        where: { id: category.id },
        relations: ['parentCategory', 'subCategories'],
      });

      return new CategoryItemOutput(cat, lang);
    } catch (error) {
      if (category.id) {
        await this._categoryRepository.delete(category.id);
      }
      throw new ConflictException(
        `${AddCategoryService.name} - ${this._tryExecution.name}` +
          error.message,
      );
    }
  }

  private async _tryValidation(
    input: AddCategoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

      let parentCategory: Category = null;
      let subCategories: Category[] = [];

      if (!isNullOrWhiteSpace(input.parentCategoryId)) {
        parentCategory = await this._categoryRepository.findOne({
          where: { id: input.parentCategoryId },
        });
        if (!parentCategory) {
          throw new NotFoundException(
            `ParentCategory with id '${input.parentCategoryId}' not found`,
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

        subCategories.forEach((subCat) => {
          if (subCat.parentCategory) {
            throw new HttpException(
              `The category '${getLangOrFirstAvailableValue(
                subCat.title,
                lang,
              )}' already have a parent category`,
              HttpStatus.CONFLICT,
            );
          }
        });
      }

      return {
        parentCategory,
        subCategories,
        isParentCategory: !!parentCategory,
        isSubCategories: subCategories.length > 0,
        lang,
      };
    } catch (error) {
      throw new BadRequestException(
        `${AddCategoryService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
