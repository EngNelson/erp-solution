import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Counter } from 'src/domain/entities/finance';
import { CounterRepository } from 'src/repositories/finance';
import { SharedService } from '../utilities';
import { UserCon } from '@glosuite/shared';

@Injectable()
export class CounterService {
  constructor(
    @InjectRepository(Counter)
    private readonly _counterRepository: CounterRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generateReference(): Promise<string> {
    try {
      const [counters, count] = await this._counterRepository.findAndCount({
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 6);

      const prefix = 'VERSM';

      return `${prefix}${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }

  generateName(user: UserCon): string {
    const prefix = 'C';
    const middle = user.workStation.warehouse.name
      .replace(' ', '-')
      .toUpperCase();
    const suffix = user.lastname.replace(' ', '-').toUpperCase();

    return `${prefix}-${middle}-${suffix}`;
  }
}
