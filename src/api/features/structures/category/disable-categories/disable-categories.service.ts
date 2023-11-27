import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentRoles, ISOLang, Status, UserCon } from '@glosuite/shared';
import { Category } from 'src/domain/entities/structures';
import {
  CategoryRepository,
  CategoryTreeRepository,
} from 'src/repositories/structures';
import {
  DisableCategoriesInput,
  DisableCategoriesOutput,
  DisableCategoriesOutputItems,
} from './dto';

type ValidationResult = {
  categories: Category[];
  user: UserCon;
};

@Injectable()
export class DisableCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async disableCategories(
    input: DisableCategoriesInput,
    user: UserCon,
  ): Promise<DisableCategoriesOutput> {
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

    const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

    return new DisableCategoriesOutput(
      executionResult.map(
        (item) => new DisableCategoriesOutputItems(item, lang),
      ),
      executionResult.length,
    );
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<Category[]> {
    try {
      const { categories, user } = validationResult;

      const categoriesToDisable: Category[] = [];
      await Promise.all(
        categories?.map(async (category) => {
          const children = await this._categoryTreeRepository.findDescendants(
            category,
          );
          categoriesToDisable.push(...children);
        }),
      );

      categoriesToDisable?.map(async (cat) => {
        cat.status = Status.DISABLED;
        cat.disabledBy = user;
        cat.disabledAt = new Date();

        await this._categoryRepository.softDelete(cat.id);
      });

      await this._categoryRepository.save(categoriesToDisable);

      return categoriesToDisable;
    } catch (error) {
      throw new BadRequestException(
        `${DisableCategoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: DisableCategoriesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { ids } = input;

      const categories = await this._categoryRepository.findByIds(ids);
      if (categories.length !== ids.length) {
        throw new NotFoundException(
          `Some categories among ids: '${ids}' are not found`,
        );
      }

      categories.map(async (category) => {
        const children = await this._categoryTreeRepository.findDescendants(
          category,
          { relations: ['products'] },
        );

        if (
          category.products?.length > 0 ||
          children?.some((child) => child.products?.length > 0)
        ) {
          throw new BadRequestException(
            `Cannot disable categories containing or having children containing products`,
          );
        }
      });

      const isUserConHavePrivileges = categories.some(
        (category) =>
          category.createdBy.email != user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only disable categories that you have created before`,
        );
      }

      return {
        categories,
        user,
      };
    } catch (error) {
      throw new BadRequestException(
        `${DisableCategoriesService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
