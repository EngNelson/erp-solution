import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PickingList } from 'src/domain/entities/flows';
import { PickingListRepository } from 'src/repositories/flows';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class PickingListReferenceService {
  constructor(
    @InjectRepository(PickingList)
    private readonly _pickingListRepository: PickingListRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [pickingLists, count] =
        await this._pickingListRepository.findAndCount({ withDeleted: true });
      const suffix = await this._sharedService.generateSuffix(count + 1, 8);

      return `PICK${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
