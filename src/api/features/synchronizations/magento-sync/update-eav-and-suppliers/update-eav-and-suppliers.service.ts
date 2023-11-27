import { Injectable } from '@nestjs/common';
import { ImportEavAndSuppliersOutput } from 'src/domain/dto/magento';

type ValidationResult = {
  attributePageSize: number;
  attributeCurrentPage: number;
  attributeSetPageSize: number;
  attributeSetCurrentPage: number;
};

@Injectable()
export class UpdateEavAndSuppliersService {
  constructor() {}

  // async updateEavAndSuppliers(): Promise<ImportEavAndSuppliersOutput> {}

  // private async _tryExecution(result: ValidationResult): Promise<ImportEavAndSuppliersOutput>{}

  // private async _tryValidation(): Promise<ValidationResult> {}
}
