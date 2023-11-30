import {
    HttpException,
    HttpStatus,
    Injectable,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import {
    UserCon,
  } from '@glosuite/shared';
  import { EditStoragePointInput } from './dto';
  import { StoragePointRepository } from 'src/repositories/logistics/delivery-point.repository';
  import { StoragePoint } from 'src/domain/entities/logistics/delivery-point.entity';
  

  type ValidationResult = {
    storagePoint: EditStoragePointInput;
    lang: ISOLang;
    user: UserCon;
  };
  
  @Injectable()
  export class EditStoragePointService {
    constructor(
      @InjectRepository(StoragePoint)
      private readonly _storagePointRepository: Repository<StoragePointRepository>
    ) { }
  
    async editStoragePoint(
      input: EditStoragePointInput,
      user: UserCon,
      accessToken: string,
    ): Promise<EditStoragePointInput> {
  
      const validationResult = await this._tryValidation(input, user);
  
      if (!validationResult) {
        throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
      }
  
      const executionResult = await this._tryExecution(
        accessToken,
        validationResult,
      );
      if (!executionResult) {
        throw new HttpException(
          'Error Ocured During Execution',
          HttpStatus.CREATED,
        );
      }
      return executionResult;
    }
  
    private async _tryExecution(
      accessToken: string,
      result: ValidationResult,
    ): Promise<any> {
  
  
      try {
        // Update StoragePoint Data in DB And Send Response To Frontend
        return await this._storagePointRepository.update([result.storagePoint.storagePointId],result.storagePoint);
  
      } catch (error) {
        throw new HttpException(error?.message, HttpStatus.BAD_REQUEST);
      }
    }
  
    private async _tryValidation(
      input: EditStoragePointInput,
      user: UserCon,
    ): Promise<ValidationResult> {
      try {
        const lang = input.lang
          ? input.lang
          : user.preferedLang
            ? user.preferedLang
            : ISOLang.FR;
  
        // Check For Null or White Space Values
        if (
          isNullOrWhiteSpace(input.storagePointId)
        ) {
          throw new BadRequestException(
            `StoragePointId is required`,
          );
        }
  
        // Check If OrderId Exists
        const packageData = await this._storagePointRepository.findOne(input.storagePointId);
        if (!packageData) {
          throw new HttpException(`Storage with id ${input.storagePointId} not found`, HttpStatus.NOT_FOUND);
        }
  
        return { storagePoint: input, user, lang };
      } catch (error) {
        throw new BadRequestException("Validation failed");
      }
  
    }
  }
  