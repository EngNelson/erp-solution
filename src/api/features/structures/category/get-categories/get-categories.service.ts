import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ISOLang, Status, UserCon } from '@glosuite/shared';
import { CategoryTreeItemOutput } from 'src/domain/dto/structures';
import { Category } from 'src/domain/entities/structures';
import { CategoryTreeRepository } from 'src/repositories/structures';
import { GetCategoriesInput, GetCategoriesOutput } from './dto';

type ValidationResult = {
  lang: ISOLang;
  status?: Status;
  depth?: number;
};

@Injectable()
export class GetCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async getCategories(
    input: GetCategoriesInput,
    user: UserCon,
  ): Promise<GetCategoriesOutput> {
    const validationResult = await this._tryValidation(input, user);

    if (!validationResult) {
      throw new HttpException(
        'inputs validation error',
        HttpStatus.BAD_REQUEST,
      );
    }

    const executionResult: GetCategoriesOutput = await this._tryExecution(
      validationResult,
    );

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return executionResult;
  }

  private async _tryExecution(
    input: ValidationResult,
  ): Promise<GetCategoriesOutput> {
    try {
      const { lang, status, depth } = input;

      const categories = await this._categoryTreeRepository.findTrees({
        relations: ['collections'],
        depth,
      });

      const output = categories.filter(
        (category) => category.status === status,
      );

      return new GetCategoriesOutput(
        output.map((cat) => new CategoryTreeItemOutput(cat, lang)),
        output.length,
      );
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoriesService.name} - ${this._tryExecution.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }

  private async _tryValidation(
    input: GetCategoriesInput,
    user: UserCon,
  ): Promise<ValidationResult> {
    try {
      const lang = input.lang
        ? input.lang
        : user.preferedLang
        ? user.preferedLang
        : ISOLang.FR;

      const depth = input.options.depth ? Number(input.options.depth) : null;

      if (depth !== null && (isNaN(depth) || typeof depth !== 'number')) {
        throw new HttpException(
          `depth must be a number`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        lang,
        status: input.options.status ? input.options.status : Status.ENABLED,
        depth,
      };
    } catch (error) {
      throw new BadRequestException(
        `${GetCategoriesService.name} - ${this._tryValidation.name}`,
        error.sqlMessage ? error.sqlMessage : error,
      );
    }
  }
}
