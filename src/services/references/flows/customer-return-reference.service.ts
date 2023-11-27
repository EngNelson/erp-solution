import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerReturn } from 'src/domain/entities/flows';
import { Order } from 'src/domain/entities/orders';
import { CustomerReturnRepository } from 'src/repositories/flows';
import { SharedService } from 'src/services/utilities';

@Injectable()
export class CustomerReturnReferenceService {
  constructor(
    @InjectRepository(CustomerReturn)
    private readonly _customerReturnRepository: CustomerReturnRepository,
    private readonly _sharedService: SharedService,
  ) {}

  async generate(order: Order): Promise<string> {
    try {
      const [returns, count] =
        await this._customerReturnRepository.findAndCount({
          withDeleted: true,
        });
      const suffix = await this._sharedService.generateSuffix(count + 1, 2);

      return `SAV${suffix}-${order.reference}`;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured while generating reference` + error.message,
      );
    }
  }
}
