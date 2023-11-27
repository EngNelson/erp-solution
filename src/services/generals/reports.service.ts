import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/domain/entities/structures';
import { CategoryTreeRepository } from 'src/repositories/structures';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Category)
    private readonly _categoryTreeRepository: CategoryTreeRepository,
  ) {}

  async getParentCategories(categories: Category[]): Promise<Category[]> {
    try {
      const parentCategories: Category[] = [];

      if (categories.length > 0) {
        await Promise.all(
          categories.map(async (category) => {
            const level = await this._categoryTreeRepository.countAncestors(
              category,
            );
            const parents = await this._categoryTreeRepository.findAncestors(
              category,
            );

            const catLevel = level + 1;

            let parentCategory: Category;

            if (catLevel >= 3) {
              parentCategory = parents[1];
            } else {
              parentCategory = parents[0];
            }

            parentCategories.push(parentCategory);
          }),
        );
      }

      return parentCategories;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured. ${error.message}`,
      );
    }
  }
}
