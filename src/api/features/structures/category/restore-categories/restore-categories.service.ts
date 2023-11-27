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
import { CategoryRepository } from 'src/repositories/structures';
import {
  RestoreCategoriesInput,
  RestoreCategoriesOutput,
  RestoreCategoriesOutputItems,
} from './dto';
import { In } from 'typeorm';

@Injectable()
export class RestoreCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
  ) {}

  async restoreCategories(
    input: RestoreCategoriesInput,
    user: UserCon,
  ): Promise<RestoreCategoriesOutput> {
    const executionResult = await this._tryExecution(input, user);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CONFLICT,
      );
    }

    const lang = user.preferedLang ? user.preferedLang : ISOLang.FR;

    return new RestoreCategoriesOutput(
      executionResult.map(
        (item) => new RestoreCategoriesOutputItems(item, lang),
      ),
      executionResult.length,
    );
  }

  private async _tryExecution(
    input: RestoreCategoriesInput,
    user: UserCon,
  ): Promise<Category[]> {
    try {
      const { ids } = input;

      const categories = await this._categoryRepository.find({
        where: { id: In(ids) },
        withDeleted: true,
      });

      if (categories.length < ids.length) {
        throw new NotFoundException(
          `Some categories you are trying to restore are not found`,
        );
      }

      const isUserConHavePrivileges = categories.some(
        (category) =>
          category.deletedBy != user &&
          user.roles.some(
            (role) =>
              role !== AgentRoles.SUPER_ADMIN && role !== AgentRoles.ADMIN,
          ),
      );
      if (isUserConHavePrivileges) {
        throw new UnauthorizedException(
          `You can only restore categories that you have deleted`,
        );
      }

      const categoriesToRestore: Category[] = [];

      categories.forEach(async (category) => {
        this._categoryRepository.restore(category.id);
        category.status = Status.ENABLED;
        categoriesToRestore.push(category);
      });

      await this._categoryRepository.save(categoriesToRestore);

      return categoriesToRestore;
    } catch (error) {
      throw new BadRequestException(
        `${RestoreCategoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error.message,
      );
    }
  }
}
