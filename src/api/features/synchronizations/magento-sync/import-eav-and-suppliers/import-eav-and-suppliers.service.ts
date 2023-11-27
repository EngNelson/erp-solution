import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttributeType, ISOLang } from '@glosuite/shared';
import {
  ATTRIBUTE_CODES_TO_SKIP,
  ATTRIBUTE_TYPE_MAPPING,
  CRAWL_DEFAULT_CURRENT_PAGE_FOR_EAV,
  CRAWL_DEFAULT_PAGE_SIZE_FOR_ATTRIBUTE_SET,
  CRAWL_DEFAULT_PAGE_SIZE_FOR_EAV,
  HARD_ATTRIBUTES,
  FRONTEND_INPUTS,
  GET_ATTRIBUTES,
  GET_ATTRIBUTE_SETS,
  MAGENTO_BASE_API_URL,
  MAGENTO_PRODUCT_SUPPLIER_ATTRIBUTE_CODE,
  MAGENTO_USER_TOKEN,
  SPECIAL_ATTRIBUTE_CODES,
  HARD_ATTRIBUTES_DEFINED_VALUES,
} from 'src/domain/constants';
import {
  Attribute,
  AttributeOption,
  AttributeSet,
  AttributeValue,
  Unit,
} from 'src/domain/entities/items/eav';
import { CrawlActivity } from 'src/domain/entities/magento';
import { Supplier } from 'src/domain/entities/purchases';
import { ValueType } from 'src/domain/enums/items';
import { CrawlResult, CrawlType } from 'src/domain/enums/magento';
import {
  MagentoAttributeModel,
  MagentoAttributeSetModel,
  MagentoSupplierModel,
} from 'src/domain/interfaces/magento';
import { AttributeValueType } from 'src/domain/types/catalog/eav';
import {
  AttributeOptionRepository,
  AttributeRepository,
  AttributeSetRepository,
  AttributeValueRepository,
  UnitRepository,
} from 'src/repositories/items';
import { CrawlActivityRepository } from 'src/repositories/magento';
import { SupplierRepository } from 'src/repositories/purchases';
import { CrawlEavService } from 'src/services/generals';
import { SharedService } from 'src/services/utilities';
import { ImportEavAndSuppliersOutput } from 'src/domain/dto/magento';

type ValidationResult = {
  attributePageSize: number;
  attributeCurrentPage: number;
  attributeSetPageSize: number;
  attributeSetCurrentPage: number;
};

@Injectable()
export class ImportEavAndSuppliersService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    @InjectRepository(Attribute)
    private readonly _attributeRepository: AttributeRepository,
    @InjectRepository(AttributeSet)
    private readonly _attributeSetRepository: AttributeSetRepository,
    @InjectRepository(CrawlActivity)
    private readonly _crawlActivityRepository: CrawlActivityRepository,
    @InjectRepository(AttributeValue)
    private readonly _attributeValueRepository: AttributeValueRepository,
    @InjectRepository(Supplier)
    private readonly _supplierRepository: SupplierRepository,
    @InjectRepository(AttributeOption)
    private readonly _attributeOptionRepository: AttributeOptionRepository,
    private readonly _httpService: HttpService,
    private readonly _crawlEavService: CrawlEavService,
    private readonly _sharedService: SharedService,
  ) {}

  async importEavAndSuppliers(): Promise<ImportEavAndSuppliersOutput> {
    const validationResult = await this._tryValidation();

    if (!validationResult) {
      throw new HttpException('Input validation error', HttpStatus.BAD_REQUEST);
    }

    const executionResult = await this._tryExecution(validationResult);

    if (!executionResult) {
      throw new HttpException(
        'Error occured during execution',
        HttpStatus.CREATED,
      );
    }

    console.log('Import completed successfully');

    return executionResult;
  }

  private async _tryExecution(
    result: ValidationResult,
  ): Promise<ImportEavAndSuppliersOutput> {
    try {
      let attributeCurrentPage = result.attributeCurrentPage;
      let attributeSetCurrentPage = result.attributeSetCurrentPage;
      const attributePageSize = result.attributePageSize;
      const attributeSetPageSize = result.attributeSetPageSize;

      /**
       * Get magento attributes and attribute sets
       */
      const magentoAttributes: MagentoAttributeModel[] = [];
      const magentoSuppliers: MagentoSupplierModel[] = [];
      const magentoAttributeSets: MagentoAttributeSetModel[] = [];

      /**
       * Start loop to get magento attributes
       */
      let attributeTotalCount = 0;
      let attributeTotalPages = 0;
      let myAttrCurrentPage = attributeCurrentPage;

      console.log('GET ATTRIBUTES');

      do {
        const attributePath =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(GET_ATTRIBUTES, {
            pageSize: attributePageSize,
            currentPage: myAttrCurrentPage,
          });

        console.log(attributePath);

        await this._httpService
          .axiosRef(attributePath, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            if (response.data.items.length > 0) {
              response.data.items.map((item) => {
                if (
                  item.is_user_defined &&
                  !ATTRIBUTE_CODES_TO_SKIP.includes(item.attribute_code)
                ) {
                  magentoAttributes.push({
                    id: item.attribute_id,
                    attribute_code: item.attribute_code,
                    frontend_input: item.frontend_input,
                    options: item.options,
                    is_user_defined: item.is_user_defined,
                    default_frontend_label: item.default_frontend_label,
                    backend_type: item.backend_type,
                    frontend_labels: item.frontend_labels,
                  });
                }

                if (
                  item.attribute_code ===
                  MAGENTO_PRODUCT_SUPPLIER_ATTRIBUTE_CODE
                ) {
                  item.options.map((option) => {
                    if (!this._crawlEavService.isEmpty(option.value)) {
                      magentoSuppliers.push({
                        label: option.label,
                        magentoId: option.value,
                      });
                    }
                  });
                }
              });
            }

            attributeTotalCount = response.data.total_count;

            attributeTotalPages = Math.ceil(
              attributeTotalCount / attributePageSize,
            );
            myAttrCurrentPage++;
            if (response.data.items.length >= attributePageSize)
              attributeCurrentPage++;
            console.log(
              `${magentoAttributes.length} attributes on ${attributeTotalCount} imported...`,
            );
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}`,
            );

            // throw new HttpException(error)
          });
      } while (myAttrCurrentPage < attributeTotalPages + 1);

      /**
       * Loop to get attribute sets
       */
      let attributeSetTotalCount = 0;
      let attributeSetTotalPages = 0;
      let myAttrSetCurrentPage = attributeSetCurrentPage;

      console.log('GET ATTRIBUTE SETS');

      do {
        const attributeSetPath =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(GET_ATTRIBUTE_SETS, {
            pageSize: attributeSetPageSize,
            currentPage: myAttrSetCurrentPage,
          });

        console.log(attributeSetPath);

        await this._httpService
          .axiosRef(attributeSetPath, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            if (response.data.items.length > 0) {
              response.data.items.map((item) => {
                magentoAttributeSets.push({
                  id: item.attribute_set_id,
                  attribute_set_name: item.attribute_set_name,
                });
              });
            }

            attributeSetTotalCount = response.data.total_count;

            attributeSetTotalPages = Math.ceil(
              attributeSetTotalCount / attributeSetPageSize,
            );
            myAttrSetCurrentPage++;
            if (response.data.items.length >= attributeSetPageSize)
              attributeSetCurrentPage++;

            console.log(
              `${magentoAttributeSets.length} attribute sets on ${attributeSetTotalCount} imported...`,
            );
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}`,
            );

            // throw new HttpException(error)
          });
      } while (myAttrSetCurrentPage < attributeSetTotalPages + 1);

      if (myAttrCurrentPage === attributeTotalPages + 1) {
        console.log(`End`);
        console.log(`${magentoAttributes.length} attributes imported`);
        console.log(`${magentoSuppliers.length} suppliers imported`);
      }

      if (myAttrSetCurrentPage === attributeSetTotalPages + 1) {
        console.log(`${magentoAttributeSets.length} attribute sets imported`);
      }

      /**
       * magentoAttributes treatments
       * ** 1. Create suppliers
       * ** 2. Create units and attributes
       * ** 3. Create attribute sets
       */

      // 1. Create suppliers
      console.log('1 - CREATE SUPPLIERS IF NOT EXISTS');

      const suppliersAdded: Supplier[] = [];

      if (magentoSuppliers && magentoSuppliers.length > 0) {
        // Remove existing suppliers
        for (const magentoSupplier of magentoSuppliers) {
          const { label, magentoId } = magentoSupplier;

          const supplierExist = await this._supplierRepository.findOne({
            where: [{ name: label }, { magentoId }],
          });

          if (!supplierExist) {
            const newSupplier = new Supplier();

            newSupplier.magentoId = Number(magentoId);
            newSupplier.name = label;

            await this._supplierRepository.save(newSupplier);
            suppliersAdded.push(newSupplier);
          }
        }
      }

      // 2. Create units and attributes
      console.log('2- CREATE UNITS AND ATTRIBUTES');

      const unitsAdded: Unit[] = [];
      const attributesAdded: Attribute[] = [];

      for (const magentoAttribute of magentoAttributes) {
        const {
          id,
          attribute_code,
          frontend_input,
          options,
          is_user_defined,
          default_frontend_label,
          backend_type,
          frontend_labels,
        } = magentoAttribute;

        const attributeExist = await this._attributeRepository.findOne({
          where: {
            magentoId: id,
          },
        });

        if (!attributeExist) {
          const attribute = new Attribute();

          attribute.magentoId = id;
          const attributeName =
            this._crawlEavService.removeUnnecessaryCharactersOnLabel(
              default_frontend_label,
            );
          attribute.name = this._sharedService.buildTStringValue(
            attributeName,
            ISOLang.FR,
          );

          if (
            frontend_input === FRONTEND_INPUTS.textarea ||
            frontend_input === FRONTEND_INPUTS.text
          ) {
            attribute.type = ATTRIBUTE_TYPE_MAPPING.find(
              (attributeType) => attributeType.magento === backend_type,
            ).erp;
            attribute.valueType = ValueType.INPUT_FIELD;
            attribute.hasUnit = false;

            await this._attributeRepository.save(attribute);
            attributesAdded.push(attribute);
          } else if (frontend_input === FRONTEND_INPUTS.boolean) {
            attribute.type = AttributeType.BOOLEAN;
            attribute.valueType = ValueType.YES_NO;
            attribute.hasUnit = false;

            await this._attributeRepository.save(attribute);
            attributesAdded.push(attribute);
          } else if (
            attribute_code === SPECIAL_ATTRIBUTE_CODES.batterie_en_mah
          ) {
            // create new attribute = batterie
            const attribute1 = new Attribute();

            attribute1.magentoId = id;
            const attribute1Name = this._crawlEavService
              .removeUnnecessaryCharactersOnLabel(default_frontend_label)
              .replace('_', '')
              .trim();
            attribute1.name = this._sharedService.buildTStringValue(
              attribute1Name,
              ISOLang.FR,
            );
            attribute1.type = AttributeType.NUMBER;
            attribute1.valueType = ValueType.INPUT_FIELD;
            attribute1.hasUnit = true;
            const unitsToAdd =
              await this._crawlEavService.extractUnitsFromBatterieLabel(
                default_frontend_label,
              );

            attribute1.units = unitsToAdd;

            unitsAdded.push(...unitsToAdd);

            await this._attributeRepository.save(attribute1);
            attributesAdded.push(attribute1);

            // create new attribute = type de batterie
            const attribute2 = new Attribute();

            attribute2.magentoId = id;
            attribute2.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.typeDeBatterie,
              ISOLang.FR,
            );
            attribute2.type = AttributeType.STRING;
            attribute2.valueType = ValueType.DROPDOWN;
            attribute2.hasUnit = false;

            await this._attributeRepository.save(attribute2);

            // create definedAttributeValues
            const attributeValuesToAdd: AttributeValue[] = [];

            const definedAttrValues = HARD_ATTRIBUTES_DEFINED_VALUES.find(
              (item) => item.attribute === HARD_ATTRIBUTES.typeDeBatterie,
            ).values;

            if (definedAttrValues && definedAttrValues.length > 0) {
              await Promise.all(
                definedAttrValues.map(async (definedAttrValue) => {
                  const attributeValue = new AttributeValue();

                  const value: AttributeValueType = {
                    value: definedAttrValue,
                  };
                  attributeValue.value = value;
                  attributeValue.attribute = attribute2;
                  attributeValue.attributeId = attribute2.id;

                  await this._attributeValueRepository.save(attributeValue);

                  attributeValuesToAdd.push(attributeValue);
                }),
              );

              await this._attributeValueRepository.save(attributeValuesToAdd);
            }

            attribute2.definedAttributeValues = attributeValuesToAdd;

            await this._attributeRepository.save(attribute2);
            attributesAdded.push(attribute2);
          } else if (attribute_code === SPECIAL_ATTRIBUTE_CODES.processeur) {
            // create new attribute = ferequence processeur
            const attribute1 = new Attribute();

            attribute1.magentoId = id;
            attribute1.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.frequenceProcesseur,
              ISOLang.FR,
            );
            attribute1.type = AttributeType.NUMBER;
            attribute1.valueType = ValueType.INPUT_FIELD;
            attribute1.hasUnit = true;

            const unitsToAdd = await this._crawlEavService.getAttributeUnits(
              magentoAttribute,
            );
            attribute1.units = unitsToAdd;

            unitsAdded.push(...unitsToAdd);

            await this._attributeRepository.save(attribute1);

            attributesAdded.push(attribute1);

            // create new attribute = modele de processeur
            const attribute2 = new Attribute();

            attribute2.magentoId = id;
            attribute2.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.modeleProcesseur,
              ISOLang.FR,
            );
            attribute2.type = AttributeType.STRING;
            attribute2.valueType = ValueType.DROPDOWN;
            attribute2.hasUnit = false;

            await this._attributeRepository.save(attribute2);

            // create attribute values
            const attributeValuesToAdd2: AttributeValue[] = [];

            const definedAttrValues2 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
              (item) => item.attribute === HARD_ATTRIBUTES.modeleProcesseur,
            ).values;

            if (definedAttrValues2 && definedAttrValues2.length > 0) {
              definedAttrValues2.map((definedAttrValue) => {
                const attributeValue = new AttributeValue();

                const value: AttributeValueType = {
                  value: definedAttrValue,
                };

                attributeValue.value = value;
                attributeValue.attribute = attribute2;
                attributeValue.attributeId = attribute2.id;

                attributeValuesToAdd2.push(attributeValue);
              });

              await this._attributeValueRepository.save(attributeValuesToAdd2);
            }

            attribute2.definedAttributeValues = attributeValuesToAdd2;

            await this._attributeRepository.save(attribute2);
            attributesAdded.push(attribute2);

            // create new attribute = gpu
            const attribute3 = new Attribute();

            attribute3.magentoId = id;
            attribute3.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.gpu,
              ISOLang.FR,
            );
            attribute3.type = AttributeType.STRING;
            attribute3.valueType = ValueType.DROPDOWN;
            attribute3.hasUnit = false;

            await this._attributeRepository.save(attribute3);

            // create defined attributes values
            const attributeValuesToAdd3: AttributeValue[] = [];

            const definedAttrValues3 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
              (item) => item.attribute === HARD_ATTRIBUTES.gpu,
            ).values;

            if (definedAttrValues3 && definedAttrValues3.length > 0) {
              definedAttrValues3.map((definedAttrValue) => {
                const attributeValue = new AttributeValue();

                const value: AttributeValueType = {
                  value: definedAttrValue,
                };

                attributeValue.value = value;
                attributeValue.attribute = attribute3;
                attributeValue.attributeId = attribute3.id;

                attributeValuesToAdd3.push(attributeValue);
              });

              await this._attributeValueRepository.save(attributeValuesToAdd3);
            }

            attribute3.definedAttributeValues = attributeValuesToAdd3;

            await this._attributeRepository.save(attribute3);
            attributesAdded.push(attribute3);

            // create new attribute = soc
            const attribute4 = new Attribute();

            attribute4.magentoId = id;
            attribute4.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.soc,
              ISOLang.FR,
            );
            attribute4.type = AttributeType.STRING;
            attribute4.valueType = ValueType.DROPDOWN;
            attribute4.hasUnit = false;

            await this._attributeRepository.save(attribute4);

            // create defined attributes values
            const attributeValuesToAdd4: AttributeValue[] = [];

            const definedAttrValues4 = HARD_ATTRIBUTES_DEFINED_VALUES.find(
              (item) => item.attribute === HARD_ATTRIBUTES.soc,
            ).values;

            if (definedAttrValues4 && definedAttrValues4.length > 0) {
              definedAttrValues4.map((definedAttrValue) => {
                const attributeValue = new AttributeValue();

                const value: AttributeValueType = {
                  value: definedAttrValue,
                };

                attributeValue.value = value;
                attributeValue.attribute = attribute4;
                attributeValue.attributeId = attribute4.id;

                attributeValuesToAdd4.push(attributeValue);
              });

              await this._attributeValueRepository.save(attributeValuesToAdd4);
            }

            attribute4.definedAttributeValues = attributeValuesToAdd4;
            await this._attributeRepository.save(attribute4);

            attributesAdded.push(attribute4);

            // create new attribute = version android
            const attribute5 = new Attribute();

            attribute5.magentoId = id;
            attribute5.name = this._sharedService.buildTStringValue(
              HARD_ATTRIBUTES.versionAndroid,
              ISOLang.FR,
            );
            attribute5.type = AttributeType.NUMBER;
            attribute5.valueType = ValueType.INPUT_FIELD;
            attribute5.hasUnit = false;

            await this._attributeRepository.save(attribute5);

            attributesAdded.push(attribute5);
          } else if (
            frontend_input === FRONTEND_INPUTS.select ||
            frontend_input === FRONTEND_INPUTS.multiselect
          ) {
            const attributeData =
              await this._crawlEavService.definedSelectAttribute(
                magentoAttribute,
              );

            const { type, valueType, hasUnit, definedAttributeValues, units } =
              attributeData;

            if (
              attributesAdded.find(
                (attributeAdded) =>
                  attributeAdded.name === attribute.name &&
                  attributeAdded.type === attribute.type &&
                  attributeAdded.valueType === attribute.valueType &&
                  attributeAdded.hasUnit,
              )
            ) {
              // Just push new units and save
              if (units && units.length > 0) {
                attribute.units.push(...units);
              }
            } else {
              // Create the new attribute
              attribute.units = units;
            }

            attribute.type = type;
            attribute.valueType = valueType;
            attribute.hasUnit = hasUnit;

            await this._attributeRepository.save(attribute);

            // create default attributes values
            if (definedAttributeValues && definedAttributeValues.length > 0) {
              const definedAttributeValuesToAdd: AttributeValue[] = [];

              for (const definedAttrValue of definedAttributeValues) {
                const { value, code, unit } = definedAttrValue;

                const attributeValue = new AttributeValue();
                let unitToAdd: Unit;

                if (!!unit) {
                  const allUnits = await this._unitRepository.find();

                  if (
                    !allUnits.find(
                      (unit) =>
                        unit.symbol.toLowerCase() === unit.symbol.toLowerCase(),
                    )
                  ) {
                    const newUnit = new Unit();

                    newUnit.title = this._sharedService.buildTStringValue(
                      unit.title,
                      ISOLang.FR,
                    );
                    newUnit.symbol = unit.symbol;

                    await this._unitRepository.save(newUnit);
                    unitToAdd = newUnit;

                    unitsAdded.push(newUnit);
                  }
                }

                if (unitToAdd) {
                  attributeValue.unit = unitToAdd;
                  attributeValue.unitId = unitToAdd.id;
                }

                const valueToAdd: AttributeValueType = {
                  code: code ? code : null,
                  value: value,
                  unitId: unitToAdd ? unitToAdd.id : null,
                };
                attributeValue.value = valueToAdd;
                attributeValue.attribute = attribute;
                attributeValue.attributeId = attribute.id;

                definedAttributeValuesToAdd.push(attributeValue);
              }

              attribute.definedAttributeValues = definedAttributeValuesToAdd;
              await this._attributeRepository.save(attribute);
            }

            attributesAdded.push(attribute);
          } else {
            console.log('**** THIS MAY NOT APPEND ****');
          }
        }
      }

      // 3. Create attribute sets

      console.log('3 - CREATE ATTRIBUTE SETS');

      const attributeSetsAdded: AttributeSet[] = [];

      if (magentoAttributeSets && magentoAttributeSets.length > 0) {
        for (const magentoAttributeSet of magentoAttributeSets) {
          const { id, attribute_set_name } = magentoAttributeSet;

          const attributeSetExist = await this._attributeSetRepository.find({
            where: [{ magentoId: id }, { title: attribute_set_name }],
          });

          if (!attributeSetExist || attributeSetExist.length === 0) {
            const attributeSet = new AttributeSet();

            attributeSet.magentoId = id;
            attributeSet.title = attribute_set_name;

            // create options
            const magentoAttributeOptions =
              await this._crawlEavService.getAttributeSetOptions(id);

            const optionsToAdd: AttributeOption[] = [];

            if (magentoAttributeOptions && magentoAttributeOptions.length > 0) {
              await this._attributeSetRepository.save(attributeSet);

              for (const magentoAttributeOption of magentoAttributeOptions) {
                const { is_required, attribute_id } = magentoAttributeOption;

                const attribute = await this._attributeRepository.findOne({
                  where: { magentoId: attribute_id },
                });

                if (attribute) {
                  const attributeOption = new AttributeOption();

                  attributeOption.attribute = attribute;
                  attributeOption.attributeId = attribute.id;
                  attributeOption.attributeSet = attributeSet;
                  attributeOption.attributeSetId = attributeSet.id;
                  attributeOption.required = is_required;

                  optionsToAdd.push(attributeOption);
                }
              }

              await this._attributeOptionRepository.save(optionsToAdd);
            }

            attributeSetsAdded.push(attributeSet);
          }
        }
      }

      /**
       * Add new CrawlActivities
       */
      const crawlActivities: CrawlActivity[] = [];

      const crawlActivityForAttributes = new CrawlActivity();

      crawlActivityForAttributes.action = CrawlType.IMPORT_CRAWL;
      crawlActivityForAttributes.entity = Attribute.name;
      crawlActivityForAttributes.pageSize = attributePageSize;
      crawlActivityForAttributes.currentPage = attributeCurrentPage;
      crawlActivityForAttributes.totalCount = attributeTotalCount;
      crawlActivityForAttributes.result = CrawlResult.SUCCESS;

      crawlActivities.push(crawlActivityForAttributes);

      const crawlActivityForAttributeSets = new CrawlActivity();

      crawlActivityForAttributeSets.action = CrawlType.IMPORT_CRAWL;
      crawlActivityForAttributeSets.entity = AttributeSet.name;
      crawlActivityForAttributeSets.pageSize = attributeSetPageSize;
      crawlActivityForAttributeSets.currentPage = attributeSetCurrentPage;
      crawlActivityForAttributeSets.totalCount = attributeSetTotalCount;
      crawlActivityForAttributeSets.result = CrawlResult.SUCCESS;

      crawlActivities.push(crawlActivityForAttributeSets);

      await this._crawlActivityRepository.save(crawlActivities);

      console.log('******* SUPPLIERS ADDED = ', suppliersAdded.length);
      console.log('******* UNITS ADDED = ', unitsAdded.length);
      console.log('******* ATTRIBUTES ADDED = ', attributesAdded.length);
      console.log('******* ATTRIBUTE SETS ADDED = ', attributeSetsAdded.length);

      return new ImportEavAndSuppliersOutput(
        unitsAdded.length,
        attributesAdded.length,
        attributeSetsAdded.length,
        suppliersAdded.length,
      );
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ImportEavAndSuppliersService.name} - ${this._tryExecution.name}`,
        error.message ? error.message : error,
      );
    }
  }

  private async _tryValidation(): Promise<ValidationResult> {
    try {
      let attributePageSize: number = CRAWL_DEFAULT_PAGE_SIZE_FOR_EAV;
      let attributeCurrentPage: number = CRAWL_DEFAULT_CURRENT_PAGE_FOR_EAV;
      let attributeSetPageSize: number =
        CRAWL_DEFAULT_PAGE_SIZE_FOR_ATTRIBUTE_SET;
      let attributeSetCurrentPage: number = CRAWL_DEFAULT_CURRENT_PAGE_FOR_EAV;

      let attributeCrawls = await this._crawlActivityRepository.find({
        where: {
          action: CrawlType.IMPORT_CRAWL,
          entity: Attribute.name,
        },
        order: { createdAt: 'DESC' },
      });

      attributeCrawls = attributeCrawls.filter(
        (crawl) => crawl.result === CrawlResult.SUCCESS,
      );

      if (attributeCrawls && attributeCrawls.length > 0) {
        attributePageSize = attributeCrawls[0].pageSize;
        attributeCurrentPage = attributeCrawls[0].currentPage;
      }

      let attributeSetCrawls = await this._crawlActivityRepository.find({
        where: {
          action: CrawlType.IMPORT_CRAWL,
          entity: AttributeSet.name,
        },
        order: { createdAt: 'DESC' },
      });

      attributeSetCrawls = attributeSetCrawls.filter(
        (crawl) => crawl.result === CrawlResult.SUCCESS,
      );

      if (attributeSetCrawls && attributeSetCrawls.length > 0) {
        attributeSetPageSize = attributeSetCrawls[0].pageSize;
        attributeSetCurrentPage = attributeSetCrawls[0].currentPage;
      }

      return {
        attributePageSize,
        attributeCurrentPage,
        attributeSetPageSize,
        attributeSetCurrentPage,
      };
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        `${ImportEavAndSuppliersService.name} - ${this._tryValidation.name}`,
        error.message ? error.message : error,
      );
    }
  }
}
