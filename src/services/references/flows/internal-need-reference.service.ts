import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InternalNeed } from 'src/domain/entities/flows';
import { InternalNeedRepository } from 'src/repositories/flows';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class InternalNeedReferenceService {
  constructor(
    @InjectRepository(InternalNeed)
    private readonly _internalNeedRepository: InternalNeedRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(): Promise<string> {
    try {
      const [needs, count] = await this._internalNeedRepository.findAndCount({
        withDeleted: true,
      });
      const suffix = await this._sharedService.generateSuffix(count + 1, 4);

      return `IN${suffix}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
