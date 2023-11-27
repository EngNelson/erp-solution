import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Investigation } from 'src/domain/entities/flows';
import { InvestigationRepository } from 'src/repositories/flows';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class InvestigationReferenceService {
  constructor(
    @InjectRepository(Investigation)
    private readonly _investigationRepository: InvestigationRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(barcode: string): Promise<string> {
    try {
      // const [investigations, count] =
      //   await this._investigationRepository.findAndCount({ withDeleted: true });

      // const suffix = await this._sharedService.generateSuffix(count + 1, 4);

      return `INQ-${barcode}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
