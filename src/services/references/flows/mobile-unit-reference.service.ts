import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileUnit } from 'src/domain/entities/flows';
import { MobileUnitRepository } from 'src/repositories/flows';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class MobileUnitReferenceService {
  constructor(
    @InjectRepository(MobileUnit)
    private readonly _mobileUnitRepository: MobileUnitRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [units, count] = await this._mobileUnitRepository.findAndCount({
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 6);

      return `MU-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
