import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StoragePoint } from 'src/domain/entities/warehouses';
import { StoragePointRepository } from 'src/repositories/warehouses';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class WarehouseReferenceService {
  constructor(
    @InjectRepository(StoragePoint)
    private readonly _storagePointRepository: StoragePointRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [warehouses, count] =
        await this._storagePointRepository.findAndCount({ withDeleted: true });
      const suffix = await this._sharedService.generateSuffix(count + 1, 3);

      return `WH-${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
