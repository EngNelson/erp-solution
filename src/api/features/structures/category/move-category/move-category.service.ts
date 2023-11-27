import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, UserCon } from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';
import {
  CategoryRepository,
  CategoryTreeRepository,
} from 'src/repositories/structures';
import { MoveCategoryInput } from './dto';

type ValidationResult = {
  category: Category;
  targetCategory: Category;
};

@Injectable()
export class MoveCategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly _catgeoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async moveCategory(
    input: MoveCategoryInput,
    user: UserCon,
  ): Promise<boolean> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!validationResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<boolean> {
    try {
      const { category, targetCategory } = validationResult;

      category.parentCategory = targetCategory;

      await this._catgeoryRepository.save(category);

      return true;
    } catch (error) {
      throw new BadRequestException(
        `${MoveCategoryService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: MoveCategoryInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { categoryId, targetCategoryId } = input;
      const category = await this._catgeoryRepository.findOne({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with id '${categoryId}' not found`,
        );
      }

      const targetCategory = await this._catgeoryRepository.findOne({
        where: { id: targetCategoryId },
      });
      if (!targetCategoryId) {
        throw new NotFoundException(
          `Category with id '${targetCategoryId}' not found`,
        );
      }

      if (category.id === targetCategory.id) {
        throw new BadRequestException(
          `You are trying to move a category to itself`,
        );
      }

      const targetParents = await this._categoryTreeRepository.findAncestors(
        targetCategory,
      );

      const isCategoryToMoveTargetParent = targetParents.some(
        (parent) => parent.id === category.id,
      );

      if (isCategoryToMoveTargetParent) {
        throw new BadRequestException(
          `Sorry you cannot move a category to its child`,
        );
      }

      return { category, targetCategory };
    } catch (error) {
      throw new BadRequestException(
        `${MoveCategoryService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
