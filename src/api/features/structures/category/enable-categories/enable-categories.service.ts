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
  EnableCategoriesInput,
  EnableCategoriesOutput,
  EnableCategoriesOutputItems,
} from './dto';

type ValidationResult = {
  categories: Category[];
  withChildrens?: boolean;
};

@Injectable()
export class EnableCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async enableCategories(
    input: EnableCategoriesInput,
    user: UserCon,
  ): Promise<EnableCategoriesOutput> {
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

    return new EnableCategoriesOutput(
      executionResult.map(
        (item) => new EnableCategoriesOutputItems(item, lang),
      ),
      executionResult.length,
    );
  }

  private async _tryExecution(
    validationResult: ValidationResult,
  ): Promise<Category[]> {
    try {
      const { categories, withChildrens } = validationResult;

      const categoriesToEnable: Category[] = [];
      await Promise.all(
        categories?.map(async (category) => {
          const children = await this._categoryTreeRepository.findDescendants(
            category,
          );
          categoriesToEnable.push(...children);
        }),
      );

      categoriesToEnable?.map(async (cat) => {
        cat.status = Status.ENABLED;
      });

      await this._categoryRepository.save(categoriesToEnable);

      return categoriesToEnable;
    } catch (error) {
      throw new BadRequestException(
        `${EnableCategoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: EnableCategoriesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const { ids, withChildrens } = input;

      const categories = await this._categoryRepository.findByIds(ids);
      if (categories.length !== ids.length) {
        throw new NotFoundException(
          `Some categories among ids: '${ids}' are not found`,
        );
      }

      const isUserConHavePrivileges = categories.some(
        (category) =>
          category.disabledBy.email != user.email &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only enable categories you have disable before`,
        );
      }

      return { categories, withChildrens };
    } catch (error) {
      throw new BadRequestException(
        `${EnableCategoriesService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
