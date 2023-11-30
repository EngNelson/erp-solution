import {
    HttpException,
    HttpStatus,
    Injectable,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {
    UserCon,
  } from '@glosuite/shared';
  import { GetStoragePointsInput } from './dto';
  import { StoragePointRepository } from 'src/repositories/logistics/delivery-point.repository';
  import { StoragePoint } from 'src/domain/entities/logistics/delivery-point.entity';
  
  
  @Injectable()
  export class GetStoragePointsService {
    constructor(
      @InjectRepository(StoragePoint)
      private readonly _storagePointRepository: Repository<StoragePointRepository>
    ) { }
  
    async getStoragePoints(
      input: GetStoragePointsInput,
      user: UserCon,
      accessToken: string,
    ): Promise<any> {
  
      try {
        console.log(input);
        const savedStoragePoint = await this._storagePointRepository.find();
        return savedStoragePoint;
      } catch (error) { 
        throw new HttpException("An unknown error occured ", HttpStatus.EXPECTATION_FAILED);
      }
    }
  
  }
  