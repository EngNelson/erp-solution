import {
  Get,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ISOLang,
  PaginationDto,
  UserCon,
} from '@glosuite/shared';
import { Delivery } from 'src/domain/entities/logistics';
import { DeliveryRepository } from 'src/repositories/logistics';
import { GetDeliveriesInput, GetDeliveriesOutput } from './dto';
import { GetDeliveriesOptionsDto } from 'src/domain/dto/delivery/get-deliveries-options.dto';

type ValidationResult = {
  pagination: PaginationDto ;
  option?:GetDeliveriesOptionsDto ;
  lang?: ISOLang;
  user: UserCon;
};

@Injectable()
export class GetDeliveriesService{
 
  constructor(
    @InjectRepository(Delivery)
    private readonly _deliveryRepository: DeliveryRepository,
){}
@Get()
async getDeliveries( input: GetDeliveriesInput,
  user: UserCon,){
  const deliveries = await this._deliveryRepository.find();

  return deliveries;
  
}

}




//   input: GetDeliveriesInput,
//   user: UserCon,
// ): Promise<GetDeliveriesOutput>{
//   const { pagination, options } = input;
//   const validationResult = await this._tryValidation(
//     pagination,
//     user,
//     options,
//   );

//   if (!validationResult) {
//     throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
//   }

  
//   const executionResult = await this._tryExecution(validationResult);

//   // if (!executionResult) {
//   //   throw new HttpException(
//   //     'Error occured during execution',
//   //     HttpStatus.CREATED,
//   //   );
//   // }

//   return executionResult;
// }
//   private _tryExecution(validationResult: any) {
//     throw new Error('Method not implemented.');
//   }

// private async _tryExecution(
//   result: ValidationResult,
// ): Promise<GetDeliveriesOutput> {



// try{
//   const{

//   }= result;
// }
//   // return null;
// }

  // private _tryValidation(
  //   pagination: PaginationDto, user: UserCon, options: GetDeliveriesOptionsDto) {

  //   throw new Error('Method not implemented.');
  // }



// }
