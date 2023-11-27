import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, Status, UserCon } from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';
import {
  CategoryRepository,
  CategoryTreeRepository,
} from 'src/repositories/structures';
import { DeleteCategoriesInput, DeleteCategoriesOutput } from './dto';

type ValidationResult = {
  categories: Category[];
  user: UserCon;
};

@Injectable()
export class DeleteCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async deleteCategories(
    input: DeleteCategoriesInput,
    user: UserCon,
  ): Promise<DeleteCategoriesOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    return new DeleteCategoriesOutput(executionResult.length, true);
  }

  private async _tryExecution(result: ValidationResult): Promise<Category[]> {
    try {
      const { categories, user } = result;

      const categoriesToDelete: Category[] = [];

      await Promise.all(
        categories.map(async (category) => {
          const children = await this._categoryTreeRepository.findDescendants(
            category,
          );
          categoriesToDelete.push(...children);
          // category.status = Status.DISABLED;
          // category.deletedBy = user;
          // categoriesToDelete.push(category);
          // await this._categoryRepository.softDelete(category.id);
        }),
      );

      categoriesToDelete.forEach(async (cat) => {
        cat.status = Status.DISABLED;
        cat.deletedBy = user;

        this._categoryRepository.softDelete(cat.id);
      });

      await this._categoryRepository.save(categoriesToDelete);

      return categoriesToDelete;
    } catch (error) {
      console.log(error);

      throw new ConflictException(
        `${DeleteCategoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DeleteCategoriesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { categoryIds } = input;

      const categories = await this._categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException(
          `Some categories among ids: '${categoryIds}' are not found`,
        );
      }

      categories.map(async (category) => {
        const children = await this._categoryTreeRepository.findDescendants(
          category,
        );

        if (
          category?.products?.length > 0 ||
          children.some((child) => child.products?.length > 0)
        ) {
          throw new BadRequestException(
            `Cannot delete categories containing or having children containing products`,
          );
        }
      });

      const isUserNotHavePrivileges = categories.some(
        (category) =>
          category.createdBy.email !== user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserNotHavePrivileges) {
        throw new UnauthorizedException(
          `You can only delete categories that you have created before`,
        );
      }

      return {
        categories,
        user,
      };
    } catch (error) {
      console.log(error);

      throw new BadRequestException(
        `${DeleteCategoriesService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
