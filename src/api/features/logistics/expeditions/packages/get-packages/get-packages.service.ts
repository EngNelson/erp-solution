import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  UserCon,
} from '@glosuite/shared';
import { Packages } from 'src/domain/entities/logistics';
import { OrderRepository } from 'src/repositories/orders';
import { Order } from 'src/domain/entities/orders';
import { GetPackagesInput } from './dto/get-packages-input.dto';



@Injectable()
export class GetPackagesService {
  constructor(
    @InjectRepository(Packages)
    private readonly _packagesRepository: PackagesRepository,
    @InjectRepository(Order)
    private readonly _orderRepository: OrderRepository,
  ) { }

  async getPackages(
    input: GetPackagesInput,
    user: UserCon,
    accessToken: string,
  ): Promise<any> {

   return this._packagesRepository.find();
  }

}
