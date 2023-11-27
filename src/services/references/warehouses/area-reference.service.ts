import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Area } from 'src/domain/entities/warehouses';
import { AreaRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class AreaReferenceService {
  constructor(
    @InjectRepository(Area)
    private readonly _areaRepository: AreaRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [areas, count] = await this._areaRepository.findAndCount({
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 4);

      return `ZONE-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
