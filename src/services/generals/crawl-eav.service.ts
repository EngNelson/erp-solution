import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttributeType, ISOLang } from '@glosuite/shared';
import {
  CHARACTERS_TO_REMOVED,
  CHARACTERS_TO_SPLIT_ON_UNIT,
  COLORS_VALUES,
  DEFINED_UNITS,
  FRONTEND_INPUTS,
  GET_ATTRIBUTE_SET_ATTRIBUTES,
  GRAMME_SYMBOL,
  LABEL_FAIRE_UN_CHOIX,
  MAGENTO_BASE_API_URL,
  MAGENTO_USER_TOKEN,
  PLUS_SIGN,
  SPECIAL_ATTRIBUTE_CODES,
} from 'src/domain/constants';
import { Unit } from 'src/domain/entities/items/eav';
import {
  DefinedAttributeValues,
  DefinedUnitModel,
  MagentoAttributeModel,
  MagentoAttributeOptionModel,
  AttributeData as AttributeData,
  MagentoAttributeSetOptionModel,
} from 'src/domain/interfaces/magento';
import { UnitRepository } from 'src/repositories/items';
import { SharedService } from '../utilities';
import { ValueType } from 'src/domain/enums/items';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class CrawlEavService {
  constructor(
    @InjectRepository(Unit)
    private readonly _unitRepository: UnitRepository,
    private readonly _sharedService: SharedService,
    private readonly _httpService: HttpService,
  ) {}

  isEmpty(value: string): boolean {
    switch (value) {
      case '':
        return true;
      case ' ':
        return true;
      case null:
        return true;
      case undefined:
        return true;
      default:
        return false;
    }
  }

  removeUnnecessaryCharactersOnLabel(originalLabel: string): string {
    let label = originalLabel;

    for (const char of CHARACTERS_TO_REMOVED) {
      label = label.split(char).join(' ');
    }

    label.replace('_', ' ').trim();

    label = this._sharedService.capitalizeFirstLetter(label);

    return label;
  }

  async definedSelectAttribute(
    magentoAttribute: MagentoAttributeModel,
  ): Promise<AttributeData> {
    try {
      const attributeData: AttributeData = {
        type: null,
        valueType: null,
        hasUnit: false,
        definedAttributeValues: [],
      };

      /**
       * Get attribute units
       */
      const units = await this.getAttributeUnits(magentoAttribute);

      /**
       * Get attribute values
       */
      const definedAttributesValues = await this.getAttributeValues(
        magentoAttribute,
      );

      attributeData.definedAttributeValues = definedAttributesValues;

      if (this._isAttributeOptionContainPlusSign(magentoAttribute.options)) {
        if (
          this.isOptionsWithPlusSignHasUnits(magentoAttribute.options) &&
          magentoAttribute.attribute_code !== SPECIAL_ATTRIBUTE_CODES.reseau
        ) {
          attributeData.type = !this.isOptionsWithPlusSignHasUnits(
            magentoAttribute.options,
          )
            ? AttributeType.STRING
            : AttributeType.NUMBER;
          attributeData.valueType = ValueType.MULTIPLE_SELECT;
          attributeData.hasUnit = true;
        } else if (
          this.isOptionsWithPlusSignHasUnits(magentoAttribute.options) &&
          magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.reseau
        ) {
          attributeData.type = AttributeType.STRING;
          attributeData.valueType = ValueType.DROPDOWN;
          attributeData.hasUnit = false;
        } else {
          attributeData.type =
            !this._isOptionsWithoutPlusSignContainsStringValues(
              magentoAttribute.options,
            )
              ? AttributeType.STRING
              : AttributeType.NUMBER;
          attributeData.valueType = ValueType.DROPDOWN;
          attributeData.hasUnit = false;
        }
      } else if (
        this.isOptionsWithoutPlusSignHasUnits(magentoAttribute.options)
      ) {
        attributeData.type = !this._isOptionsWithPlusSignContainsStringValues(
          magentoAttribute.options,
        )
          ? AttributeType.STRING
          : AttributeType.NUMBER;
        attributeData.valueType = ValueType.INPUT_FIELD;
        attributeData.hasUnit = true;
      } else if (
        !this.isOptionsWithoutPlusSignHasUnits(magentoAttribute.options) &&
        magentoAttribute.attribute_code ===
          SPECIAL_ATTRIBUTE_CODES.bonnet_taille
      ) {
        attributeData.type = !this._isOptionsWithPlusSignContainsStringValues(
          magentoAttribute.options,
        )
          ? AttributeType.STRING
          : AttributeType.NUMBER;
        attributeData.valueType = ValueType.DROPDOWN;
        attributeData.hasUnit = true;
      } else if (
        !this.isOptionsWithoutPlusSignHasUnits(magentoAttribute.options) &&
        (magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.color ||
          magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.colours)
      ) {
        attributeData.type = AttributeType.OBJECT;
        attributeData.valueType = ValueType.COLOR;
        attributeData.hasUnit = false;
      } else if (
        !this.isOptionsWithoutPlusSignHasUnits(magentoAttribute.options) &&
        this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        )
      ) {
        attributeData.type = AttributeType.NUMBER;
        attributeData.valueType = ValueType.INPUT_FIELD;
        attributeData.hasUnit = false;
      } else if (
        !this.isOptionsWithoutPlusSignHasUnits(magentoAttribute.options) &&
        !this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        ) &&
        magentoAttribute.frontend_input === FRONTEND_INPUTS.multiselect
      ) {
        attributeData.type = AttributeType.STRING;
        attributeData.valueType = ValueType.MULTIPLE_SELECT;
        attributeData.hasUnit = false;
      } else {
        attributeData.type =
          !this._isOptionsWithoutPlusSignContainsStringValues(
            magentoAttribute.options,
          )
            ? AttributeType.STRING
            : AttributeType.NUMBER;
        attributeData.valueType = ValueType.DROPDOWN;
        attributeData.hasUnit = false;
      }

      attributeData.units = attributeData.hasUnit ? units : [];

      return attributeData;
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred: ${error}`);
    }
  }

  private _isAttributeOptionContainPlusSign(
    options: MagentoAttributeOptionModel[],
  ): boolean {
    const result = false;

    if (options.length > 0) {
      options.map((option) => {
        if (this.isLabelContainsPlusSign(option.label)) {
          return true;
        }
      });
    }

    return result;
  }

  isLabelContainsPlusSign(label: string): boolean {
    if (!this.isEmpty(label) && label.indexOf(PLUS_SIGN) > -1) {
      return true;
    }

    return false;
  }

  isOptionsWithoutPlusSignHasUnits(
    options: MagentoAttributeOptionModel[],
  ): boolean {
    let result = false;
    let count = 0;

    if (options.length > 0) {
      options.map((option) => {
        if (this._isOptionHasUnit(option)) {
          result = true;
          count++;
        }
      });
    }

    if (
      result &&
      (count === this._countOptionsWithoutEmptyValue(options) ||
        count === this._countOptionsWithoutEmptyValue(options) - 1 ||
        count === this._countOptionsWithoutEmptyValue(options) - 2)
    ) {
      return true;
    }

    return false;
  }

  isOptionsWithPlusSignHasUnits(
    options: MagentoAttributeOptionModel[],
  ): boolean {
    let result = false;
    let count = 0;

    if (options.length > 0) {
      options.map((option) => {
        if (!this.isEmpty(option.label)) {
          if (option.label.indexOf(PLUS_SIGN) > -1) {
            const labelPieces = option.label.split(PLUS_SIGN);

            labelPieces.map((piece) => {
              const pieceTrim = this._sharedService.leftTrim(piece);
              const splitPiece = pieceTrim.split(' ');

              if (
                (this._isStringContainsWhiteSpace(pieceTrim) &&
                  !this.isEmpty(splitPiece[splitPiece.length - 1]) &&
                  DEFINED_UNITS.some(
                    (unit) =>
                      unit.symbol.toLocaleLowerCase() ===
                      splitPiece[splitPiece.length - 1].toLocaleUpperCase(),
                  ) &&
                  parseFloat(splitPiece[0]) > 0) ||
                (!this._isStringContainsWhiteSpace(pieceTrim) &&
                  parseFloat(pieceTrim) >= 0 &&
                  this._isLabelWithSpaceHasUnit(pieceTrim))
              ) {
                result = true;
                count++;
              }
            });
          } else if (this._isOptionHasUnit(option)) {
            result = true;
            count++;
          }
        }
      });
    }

    if (
      result &&
      (count === this._countOptionsWithoutEmptyValue(options) ||
        count === this._countOptionsWithoutEmptyValue(options) - 1 ||
        count === this._countOptionsWithoutEmptyValue(options) - 2)
    ) {
      return true;
    }

    return false;
  }

  private _isOptionHasUnit(option: MagentoAttributeOptionModel): boolean {
    const label = this._sharedService.leftTrim(option.label);
    const labelReplaced = this._sharedService.leftTrim(
      option.label.replace(/\d/g, ''),
    );
    const splitLabel = label.split(' ');

    const condition =
      (this._isStringContainsWhiteSpace(label) &&
        splitLabel.length > 3 &&
        !this.isEmpty(splitLabel[splitLabel.length - 1]) &&
        (DEFINED_UNITS.some(
          (unit) =>
            unit.symbol.toLocaleLowerCase() ===
            splitLabel[splitLabel.length - 1].toLocaleLowerCase(),
        ) ||
          DEFINED_UNITS.some(
            (unit) =>
              unit.symbol.toLocaleLowerCase() ===
              splitLabel[0].trim().replace(/\d/g, '').toLocaleLowerCase(),
          )) &&
        parseFloat(splitLabel[0]) >= 0) ||
      (!this._isStringContainsWhiteSpace(label) &&
        parseFloat(label) >= 0 &&
        this._isLabelWithoutSpaceHasUnit(labelReplaced)) ||
      (this._isStringContainsWhiteSpace(label) &&
        splitLabel.length >= 3 &&
        this._isLabelWithSpaceHasUnit(splitLabel[splitLabel.length - 1]) &&
        parseFloat(splitLabel[0]) >= 0);

    return condition;
  }

  private _isOptionLabelIsString(option: MagentoAttributeOptionModel): boolean {
    const label = this._sharedService.leftTrim(option.label);
    const splitLabel = label.split(' ');

    const condition =
      (!this.isEmpty(option.label) &&
        this._isStringContainsWhiteSpace(label) &&
        !this.isEmpty(splitLabel[splitLabel.length - 1]) &&
        ((!DEFINED_UNITS.some(
          (unit) =>
            unit.symbol.toLocaleLowerCase() ===
            splitLabel[splitLabel.length - 1].toLocaleLowerCase(),
        ) &&
          !DEFINED_UNITS.some(
            (unit) =>
              unit.symbol.toLocaleLowerCase() ===
              splitLabel[0].toLocaleLowerCase(),
          )) ||
          (DEFINED_UNITS.some(
            (unit) =>
              unit.symbol.toLocaleLowerCase() ===
              splitLabel[splitLabel.length - 1].toLocaleLowerCase(),
          ) &&
            this._sharedService.isStringContainsLetter(
              label.split(splitLabel[0].toLocaleLowerCase().toString())[0],
            )))) ||
      (!this.isEmpty(label) &&
        !this._isStringContainsWhiteSpace(label) &&
        parseFloat(label) >= 0 === false);

    return condition;
  }

  private _isStringContainsWhiteSpace(str: string): boolean {
    return /\s/.test(str);
  }

  private _isLabelWithoutSpaceHasUnit(label: string): boolean {
    let verify = false;

    if (DEFINED_UNITS.length > 0) {
      DEFINED_UNITS.map((unit) => {
        if (
          label.toLocaleLowerCase().indexOf(unit.symbol.toLocaleLowerCase()) >
          -1
        ) {
          verify = true;
        }
      });
    }

    return verify;
  }

  private _isLabelWithSpaceHasUnit(label: string): boolean {
    let verify = false;

    if (DEFINED_UNITS.length > 0) {
      DEFINED_UNITS.map((unit) => {
        if (
          label.toLocaleLowerCase().replace(/\d/g, '') ===
          unit.symbol.toLocaleLowerCase()
        ) {
          verify = true;
        }
      });
    }

    return verify;
  }

  private _countOptionsWithoutEmptyValue(
    options: MagentoAttributeOptionModel[],
  ): number {
    let count = 0;

    if (options.length > 0) {
      count = options.filter((option) => !this.isEmpty(option.label)).length;
    }

    return count;
  }

  private _isOptionsWithoutPlusSignContainsStringValues(
    options: MagentoAttributeOptionModel[],
  ): boolean {
    if (options.length === 1 && this.isEmpty(options[0].label)) {
      return false;
    }

    let result = true;

    options.map((option) => {
      if (this._isOptionLabelIsString(option)) {
        result = false;
      }
    });

    return result;
  }

  private _isOptionsWithPlusSignContainsStringValues(
    options: MagentoAttributeOptionModel[],
  ): boolean {
    if (options.length === 1 && this.isEmpty(options[0].label)) {
      return false;
    }

    let result = true;

    options.map((option) => {
      if (option.label.indexOf(PLUS_SIGN) > -1) {
        const splitLabel = option.label.split(PLUS_SIGN);

        splitLabel.map((label) => {
          const trimLabel = this._sharedService.leftTrim(label);
          const splitTrimLabel = trimLabel.split(' ');

          if (
            (!this.isEmpty(label) &&
              this._isStringContainsWhiteSpace(trimLabel) &&
              !this.isEmpty(splitTrimLabel[1]) &&
              !DEFINED_UNITS.some(
                (unit) =>
                  unit.symbol.toLocaleLowerCase() ===
                  splitTrimLabel[1].toLocaleLowerCase(),
              )) ||
            (!this.isEmpty(trimLabel) &&
              !this._isStringContainsWhiteSpace(trimLabel) &&
              !parseFloat(trimLabel))
          ) {
            result = false;
          }
        });
      } else if (this._isOptionLabelIsString(option)) {
        result = false;
      }
    });

    return result;
  }

  async getAttributeUnits(
    magentoAttribute: MagentoAttributeModel,
  ): Promise<Unit[]> {
    try {
      const units: Unit[] = [];
      const unitsData: DefinedUnitModel[] = [];

      if (
        this._isAttributeOptionContainPlusSign(magentoAttribute.options) &&
        this.isOptionsWithPlusSignHasUnits(magentoAttribute.options)
      ) {
        await Promise.all(
          magentoAttribute.options.map(async (option) => {
            if (option.label.indexOf(PLUS_SIGN) > -1) {
              const labelPieces = option.label.split(PLUS_SIGN);

              labelPieces.map(async (piece) => {
                const trimPiece = piece.trim().toString().replace(/\d/g, '');
                if (
                  DEFINED_UNITS.find(
                    (unit) =>
                      unit.symbol.toLocaleLowerCase() ===
                      piece.trim().toLocaleLowerCase().replace(/\d/g, ''),
                  ) &&
                  trimPiece.toLowerCase() !== GRAMME_SYMBOL
                ) {
                  const unitData = DEFINED_UNITS.find(
                    (unit) =>
                      unit.symbol.toLocaleLowerCase() ===
                      trimPiece.toLocaleLowerCase(),
                  );

                  const unitExist = await this._unitRepository.findOne({
                    where: {
                      symbol: unitData.symbol,
                    },
                  });

                  if (unitData && !unitsData.includes(unitData) && !unitExist) {
                    unitsData.push(unitData);
                  }
                } else if (trimPiece.toLowerCase() === GRAMME_SYMBOL) {
                  const unitData = DEFINED_UNITS.find(
                    (unit) => unit.symbol.toLowerCase() === GRAMME_SYMBOL,
                  );

                  const unitExist = await this._unitRepository.findOne({
                    where: {
                      symbol: unitData.symbol,
                    },
                  });

                  if (unitData && !unitsData.includes(unitData) && !unitExist) {
                    unitsData.push(unitData);
                  }
                }
              });
            } else {
              const unitData = this.extractUnitFromLabel(option.label);
              const unitExist = await this._unitRepository.findOne({
                where: {
                  symbol: unitData.symbol,
                },
              });

              if (unitData && !unitsData.includes(unitData) && !unitExist) {
                unitsData.push(unitData);
              }
            }
          }),
        );
      } else {
        await Promise.all(
          magentoAttribute.options.map(async (option) => {
            const unitData = this.extractUnitFromLabel(option.label);

            if (
              unitData &&
              !unitsData.includes(unitData) &&
              !this.isEmpty(option.label)
            ) {
              const unitExist = await this._unitRepository.findOne({
                where: {
                  symbol: unitData.symbol,
                },
              });

              if (!unitExist) {
                unitsData.push(unitData);
              }
            }
          }),
        );
      }

      // console.log('UNITS = ', unitsData, '\n\n\n');

      if (unitsData.length > 0) {
        const unitsToAdd: Unit[] = [];

        await Promise.all(
          unitsData.map((unitData) => {
            const unit = new Unit();

            unit.title = this._sharedService.buildTStringValue(
              unitData.title,
              ISOLang.FR,
            );
            unit.symbol = unitData.symbol;

            if (
              !unitsToAdd.find(
                (item) =>
                  item.symbol.toLowerCase() === unit.symbol.toUpperCase(),
              )
            ) {
              unitsToAdd.push(unit);
            }
          }),
        );

        const finalUnitsToAdd: Unit[] = [];

        unitsToAdd.map((unit) => {
          if (
            !finalUnitsToAdd.find(
              (unitToAdd) => unitToAdd.symbol === unit.symbol,
            )
          ) {
            finalUnitsToAdd.push(unit);
          }
        });

        for (const unitToAdd of finalUnitsToAdd) {
          const unitExist = await this._unitRepository.findOne({
            where: {
              symbol: unitToAdd.symbol,
            },
          });

          // console.log('TEST UNIT EXIST = ', unitExist, !unitExist, '\n\n\n');

          if (!unitExist) {
            await this._unitRepository.save(unitToAdd);
            units.push(unitToAdd);
          } else {
            units.push(unitExist);
          }
        }
      }

      return units;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred: ${this.getAttributeUnits.name} - ${error}`,
      );
    }
  }

  extractUnitFromLabel(label: string): DefinedUnitModel {
    let unitData: DefinedUnitModel;

    const trimLabel = this._sharedService.leftTrim(label);
    const trimAfterReplace = this._sharedService.leftTrim(
      label.replace(',', '.'),
    );
    const splitLabel = trimLabel.split(' ');
    const lastElt = splitLabel[splitLabel.length - 1];

    if (
      this._isStringContainsWhiteSpace(trimLabel) &&
      !this.isEmpty(lastElt) &&
      DEFINED_UNITS.some(
        (unit) =>
          unit.symbol.toLocaleLowerCase() ===
          lastElt.replace(/\d/g, '').toLocaleLowerCase(),
      ) &&
      lastElt.replace(/\d/g, '').toLowerCase() !== GRAMME_SYMBOL
    ) {
      unitData = DEFINED_UNITS.find(
        (unit) =>
          unit.symbol.toLocaleLowerCase() ===
          lastElt.replace(/\d/g, '').toLocaleLowerCase(),
      );
    } else if (
      !this._isStringContainsWhiteSpace(trimLabel) &&
      parseFloat(trimLabel) &&
      trimAfterReplace
        .split(parseFloat(trimLabel).toString())[1]
        .toLocaleLowerCase() !== GRAMME_SYMBOL
    ) {
      unitData = DEFINED_UNITS.find(
        (unit) =>
          unit.symbol.toLocaleLowerCase() ===
          trimAfterReplace
            .split(parseFloat(trimAfterReplace).toString())[1]
            .toLocaleLowerCase(),
      );
    } else if (
      !this._isStringContainsWhiteSpace(trimLabel) &&
      parseFloat(trimLabel) &&
      trimAfterReplace
        .split(parseFloat(trimLabel).toString())[1]
        .toLocaleLowerCase() === GRAMME_SYMBOL
    ) {
      unitData = DEFINED_UNITS.find(
        (unit) => unit.symbol.toLowerCase() === GRAMME_SYMBOL,
      );
    }

    return unitData;
  }

  assignDefaultUnitToValuesWithPlusSignWithoutUnit(
    options: MagentoAttributeOptionModel[],
  ): DefinedUnitModel {
    let unit: DefinedUnitModel;

    const optionsWithPlus = options.filter(
      (option) => option.label.indexOf(PLUS_SIGN) > -1,
    );
    const splitFirstOption = optionsWithPlus[0].label.split(PLUS_SIGN);

    splitFirstOption.map((item) => {
      const trimItem = item.trim().toString().replace(/\d/g, '');
      const unitData = DEFINED_UNITS.find(
        (unit) => unit.symbol === trimItem && trimItem !== GRAMME_SYMBOL,
      );

      if (unitData) {
        unit = DEFINED_UNITS.find((unit) => unit.symbol === trimItem);
      } else if (trimItem === GRAMME_SYMBOL) {
        unit = DEFINED_UNITS.find(
          (unit) => unit.symbol.toLowerCase() === trimItem.toLowerCase(),
        );
      }
    });

    return unit;
  }

  private _setDefinedAttributeValue(
    label: string,
    definedAttributeValues: DefinedAttributeValues[],
    options: MagentoAttributeOptionModel[],
  ): DefinedAttributeValues[] {
    let unitData: DefinedUnitModel;

    // eslint-disable-next-line prefer-const
    unitData = this.extractUnitFromLabel(label)
      ? this.extractUnitFromLabel(label)
      : this.assignDefaultUnitToValuesWithPlusSignWithoutUnit(options);

    const definedAttributeValue: DefinedAttributeValues = {
      value: parseFloat(label.replace(',', '.')),
      unit: unitData,
    };

    if (
      !definedAttributeValues.find(
        (attrValue) => attrValue === definedAttributeValue,
      )
    ) {
      definedAttributeValues.push(definedAttributeValue);
    }

    return definedAttributeValues;
  }

  async getAttributeValues(
    magentoAttribute: MagentoAttributeModel,
  ): Promise<DefinedAttributeValues[]> {
    try {
      let definedAttributeValues: DefinedAttributeValues[] = [];

      if (this._isAttributeOptionContainPlusSign(magentoAttribute.options)) {
        if (
          this.isOptionsWithPlusSignHasUnits(magentoAttribute.options) &&
          magentoAttribute.attribute_code !== SPECIAL_ATTRIBUTE_CODES.reseau
        ) {
          magentoAttribute.options.map((option) => {
            if (!this.isEmpty(option.label)) {
              if (option.label.indexOf(PLUS_SIGN) > -1) {
                const splitLabel = option.label.split(PLUS_SIGN);

                splitLabel.map(async (label) => {
                  definedAttributeValues = this._setDefinedAttributeValue(
                    label,
                    definedAttributeValues,
                    magentoAttribute.options,
                  );
                });
              } else {
                definedAttributeValues = this._setDefinedAttributeValue(
                  option.label,
                  definedAttributeValues,
                  magentoAttribute.options,
                );
              }
            }
          });
        } else if (
          this.isOptionsWithPlusSignHasUnits(magentoAttribute.options) &&
          magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.reseau
        ) {
          magentoAttribute.options.map((option) => {
            if (
              option.label.indexOf(PLUS_SIGN) > -1 &&
              this._isStringContainsWhiteSpace(option.label) &&
              option.label.length < 20
            ) {
              const splitLabel = option.label.split(PLUS_SIGN);

              splitLabel.map((value) => {
                const definedAttributeValue: DefinedAttributeValues = {
                  value: value.trim(),
                };

                if (
                  !definedAttributeValues.find(
                    (attrValue) => attrValue === definedAttributeValue,
                  )
                ) {
                  definedAttributeValues.push(definedAttributeValue);
                }
              });
            } else {
              const definedAttributeValue: DefinedAttributeValues = {
                value: option.label.trim(),
              };

              if (
                !definedAttributeValues.find(
                  (attrValue) => attrValue === definedAttributeValue,
                )
              ) {
                definedAttributeValues.push(definedAttributeValue);
              }
            }
          });
        } else if (
          !this._isOptionsWithPlusSignContainsStringValues(
            magentoAttribute.options,
          )
        ) {
          magentoAttribute.options.map((option) => {
            if (
              option.label.indexOf(PLUS_SIGN) > -1 &&
              this._isStringContainsWhiteSpace(option.label) &&
              option.label.length < 20
            ) {
              const splitLabel = option.label.split(PLUS_SIGN);

              splitLabel.map((value) => {
                const definedAttributeValue: DefinedAttributeValues = {
                  value: value.trim(),
                };

                if (
                  !definedAttributeValues.find(
                    (attrValue) => attrValue === definedAttributeValue,
                  )
                ) {
                  definedAttributeValues.push(definedAttributeValue);
                }
              });
            } else {
              const definedAttributeValue: DefinedAttributeValues = {
                value: option.label.trim(),
              };

              if (
                !definedAttributeValues.find(
                  (attrValue) => attrValue === definedAttributeValue,
                )
              ) {
                definedAttributeValues.push(definedAttributeValue);
              }
            }
          });
        } else {
          magentoAttribute.options.map((option) => {
            const definedAttributeValue: DefinedAttributeValues = {
              value: parseFloat(option.label.replace(',', '.')),
            };

            if (
              !definedAttributeValues.find(
                (attrValue) => attrValue === definedAttributeValue,
              )
            ) {
              definedAttributeValues.push(definedAttributeValue);
            }
          });
        }
      } else if (
        this._isAttributeOptionContainPlusSign(magentoAttribute.options) &&
        !this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        )
      ) {
        magentoAttribute.options.map((option) => {
          const unitData = DEFINED_UNITS.find(
            (unit) =>
              unit.symbol.toLowerCase() ===
              this.extractUnitFromLabel(option.label).symbol.toLowerCase(),
          );

          console.log('UNIT DATA = ', unitData);

          const definedAttribute: DefinedAttributeValues = {
            value: option.label.replace(unitData.symbol, ''),
            unit: unitData,
          };

          if (
            !definedAttributeValues.find(
              (attrValue) => attrValue === definedAttribute,
            )
          ) {
            definedAttributeValues.push(definedAttribute);
          }
        });
      } else if (
        this._isAttributeOptionContainPlusSign(magentoAttribute.options) &&
        this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        )
      ) {
        magentoAttribute.options.map((option) => {
          const unitData = this.extractUnitFromLabel(option.label)
            ? this.extractUnitFromLabel(option.label)
            : this.extractUnitFromLabel(magentoAttribute.options[1].label);

          const definedAttribue: DefinedAttributeValues = {
            value: parseFloat(option.label.replace(',', '.')),
            unit: unitData,
          };

          if (
            !definedAttributeValues.find(
              (attrValue) => attrValue === definedAttribue,
            )
          ) {
            definedAttributeValues.push(definedAttribue);
          }
        });
      } else if (
        !this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        ) &&
        magentoAttribute.attribute_code ===
          SPECIAL_ATTRIBUTE_CODES.bonnet_taille
      ) {
        magentoAttribute.options.map((option) => {
          const unitData = this.extractUnitFromLabel(option.label);

          const definedAttribute: DefinedAttributeValues = {
            value: option.label.replace('cm', '').trim(),
            unit: unitData,
          };

          if (
            option.label !== LABEL_FAIRE_UN_CHOIX &&
            !definedAttributeValues.find(
              (attrValue) => attrValue === definedAttribute,
            )
          ) {
            definedAttributeValues.push(definedAttribute);
          }
        });
      } else if (
        !this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        ) &&
        magentoAttribute.attribute_code === SPECIAL_ATTRIBUTE_CODES.color
      ) {
        magentoAttribute.options.map((option) => {
          const { label, value } = option;

          if (label !== ' ' && value !== '') {
            const colorMatch = COLORS_VALUES.find(
              (color) => color.value === label,
            );

            if (colorMatch) {
              const definedAttribue: DefinedAttributeValues = {
                value: this._sharedService.buildTStringValue(
                  colorMatch.value,
                  ISOLang.FR,
                ),
                code: colorMatch.match,
              };

              definedAttributeValues.push(definedAttribue);
            }
          }
        });
      } else if (
        !this._isOptionsWithoutPlusSignContainsStringValues(
          magentoAttribute.options,
        ) &&
        magentoAttribute.attribute_code ===
          SPECIAL_ATTRIBUTE_CODES.bonnet_taille
      ) {
        magentoAttribute.options.map((option) => {
          const unitData = this.extractUnitFromLabel(option.label);

          const definedAttribute: DefinedAttributeValues = {
            value: option.label.replace('cm', '').trim(),
            unit: unitData,
          };

          if (
            !this.isEmpty(option.label) &&
            option.label !== LABEL_FAIRE_UN_CHOIX &&
            !definedAttributeValues.find(
              (attrValue) => attrValue === definedAttribute,
            )
          ) {
            definedAttributeValues.push(definedAttribute);
          }
        });
      } else {
        magentoAttribute.options.map((option) => {
          const definedAttribute: DefinedAttributeValues = {
            value: parseFloat(option.label.replace(',', '.')),
          };

          if (
            !this.isEmpty(option.label) &&
            !definedAttributeValues.find(
              (attrValue) => attrValue === definedAttribute,
            )
          ) {
            definedAttributeValues.push(definedAttribute);
          }
        });
      }

      return definedAttributeValues;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred: ${this.getAttributeValues.name} - ${error}`,
      );
    }
  }

  async extractUnitsFromBatterieLabel(label: string): Promise<Unit[]> {
    try {
      const units: Unit[] = [];
      const newLabel = label.substring(label.indexOf('en') + 2);

      if (label.indexOf('en') > -1 && !this.isEmpty(newLabel)) {
        const unitSymbol = this._removeCharacterFromUnit(newLabel).trim();

        const unitData = DEFINED_UNITS.find(
          (unit) => unit.symbol.toLowerCase() === unitSymbol.toLowerCase(),
        );

        if (unitData) {
          let unitExist = await this._unitRepository.findOne({
            where: {
              symbol: unitData.symbol,
            },
          });

          if (!unitExist) {
            unitExist = new Unit();

            unitExist.title = this._sharedService.buildTStringValue(
              unitData.title,
              ISOLang.FR,
            );
            unitExist.symbol = unitData.symbol;

            await this._unitRepository.save(unitExist);
          }

          if (
            !units.find(
              (unit) =>
                unit.symbol.toLowerCase() === unitExist.symbol.toLowerCase(),
            )
          ) {
            units.push(unitExist);
          }
        } else {
          // check on database
          const unit = await this._unitRepository.findOne({
            where: {
              symbol: unitSymbol,
            },
          });

          if (
            unit &&
            !units.find(
              (item) => item.symbol.toLowerCase() === unit.symbol.toLowerCase(),
            )
          ) {
            units.push(unit);
          }
        }
      }

      const whUnit = DEFINED_UNITS.find(
        (unit) => unit.symbol.toLowerCase() === 'wh',
      );

      if (whUnit) {
        let whUnitExist = await this._unitRepository.findOne({
          where: {
            symbol: whUnit.symbol,
          },
        });

        if (!whUnitExist) {
          whUnitExist = new Unit();

          whUnitExist.title = this._sharedService.buildTStringValue(
            whUnit.title,
            ISOLang.FR,
          );
          whUnitExist.symbol = whUnit.symbol;

          await this._unitRepository.save(whUnitExist);
        }

        if (
          !units.find(
            (unit) =>
              unit.symbol.toLowerCase() === whUnitExist.symbol.toLowerCase(),
          )
        ) {
          units.push(whUnitExist);
        }
      }

      return units;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred: ${this.extractUnitsFromBatterieLabel.name} - ${error}`,
      );
    }
  }

  private _removeCharacterFromUnit(label: string): string {
    for (const char of CHARACTERS_TO_SPLIT_ON_UNIT) {
      label = label.split(char).join(' ');
    }

    return label;
  }

  async getAttributeSetOptions(
    magentoAttributeSetId: number,
  ): Promise<MagentoAttributeSetOptionModel[]> {
    try {
      const attributeSetOptions: MagentoAttributeSetOptionModel[] = [];

      const path =
        MAGENTO_BASE_API_URL +
        this._sharedService.buildURL(
          GET_ATTRIBUTE_SET_ATTRIBUTES,
          null,
          magentoAttributeSetId,
        ) +
        '/attributes';

      console.log(`Get attribute set options path : ${path}`);

      let getOptions = false;
      let tryGet = 0;

      do {
        tryGet++;

        await this._httpService
          .axiosRef(path, {
            headers: { Authorization: `Bearer ${MAGENTO_USER_TOKEN}` },
          })
          .then((response) => {
            response.data.map((item) => {
              if (item.is_user_defined) {
                const attributeOption: MagentoAttributeSetOptionModel = {
                  is_required: item.is_required,
                  attribute_id: item.attribute_id,
                };

                attributeSetOptions.push(attributeOption);
              }
            });

            getOptions = true;
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno} - ${error}`,
            );
            // throw new InternalServerErrorException(error);
          });
      } while (!getOptions && tryGet < 5);

      return attributeSetOptions;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred: ${this.getAttributeSetOptions.name} - ${error}`,
      );
    }
  }
}
