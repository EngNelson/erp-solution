import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location } from 'src/domain/entities/warehouses';
import { LocationRepository } from 'src/repositories/warehouses';

@Injectable()
export class LocationBarcodeService {
  constructor(
    @InjectRepository(Location)
    private readonly _locationRepository: LocationRepository,
  ) {}

  async generate(): Promise<string> {
    const locations = await this._locationRepository.find();
    let code = '';
    let isCodeExist = true;

    do {
      code = `LOC${this._randomNumber(10).toString()}`;
      isCodeExist = locations.some((item) => item.barCode === code);
    } while (isCodeExist);

    return code;
  }

  private _randomNumber(length: number): number {
    return Math.floor(
      Math.pow(10, length - 1) +
        Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1),
    );
  }
}
