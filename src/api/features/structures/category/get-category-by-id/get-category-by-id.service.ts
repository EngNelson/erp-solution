import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isNullOrWhiteSpace, ISOLang, Status, UserCon } from '@glosuite/shared';
import { CategoryItemOutput } from 'src/domain/dto/structures';
import { Category } from 'src/domain/entities/structures';
import { CategoryRepository } from 'src/repositories/structures';
import { GetCategoryByIdInput } from './dto';

type ValidationResult = {
  category: Category;
  lang: ISOLang;
};

type WhereClause = { status?: Status };

@Injectable()
export class GetCategoryByIdService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryRepository: CategoryRepository,
  ) {}

  async getCategoryById(
    input: GetCategoryByIdInput,
    user: UserCon,
  ): Promise<CategoryItemOutput> {
    const validationResult = await this._tryExecution(input, user);
    const { category, lang } = validationResult;

    return new CategoryItemOutput(category, lang);
  }

  private async _tryExecution(
    input: GetCategoryByIdInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;
      const { status } = input.options;

      const whereClause: WhereClause = {};
      if (!isNullOrWhiteSpace(status)) {
        whereClause.status = status;
      }

      const category = await this._categoryRepository.findOne({
        where: { id: input.id, ...whereClause },
        relations: ['parentCategory', 'collections', 'subCategories'],
      });

      if (!category) {
        throw new NotFoundException(`Category with id '${input.id}' not found`);
      }

      category.subCategories?.filter((subCat) =>
        status ? subCat.status === status : subCat,
      );

      return {
        category,
        lang,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoryByIdService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
