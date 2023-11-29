import {
    HttpException,
    HttpStatus,
    Injectable,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {
    UserCon,
  } from '@glosuite/shared';
  import { AddStoragePointInput } from './dto';
  import { StoragePointRepository } from 'src/repositories/logistics/delivery-point.repository';
  import { StoragePoint } from 'src/domain/entities/logistics/delivery-point.entity';
  
  
  @Injectable()
  export class AddStoragePointService {
    constructor(
      @InjectRepository(StoragePoint)
      private readonly _storagePointRepository: DeliveryPointRepository
    ) { }
  
    async addStoragePoint(
      input: AddStoragePointInput,
      user: UserCon,
      accessToken: string,
    ): Promise<any> {
  
      try {
        console.log(input);
        const savedStoragePoint = await this._deliveryPointRepository.save({
          storagePointAddress:input.storagePointAddress
        });
        return savedStoragePoint;
      } catch (error) {
        console.log("Error is ",error?.message);
        
        throw new HttpException("An unknown error occured ", HttpStatus.EXPECTATION_FAILED);
      }
    }
  
  }
  