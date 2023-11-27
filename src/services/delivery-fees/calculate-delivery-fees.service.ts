import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ValueMap } from '@glosuite/shared';
import { ProductVariant } from 'src/domain/entities/items';
import { Order } from 'src/domain/entities/orders';
import { Category } from 'src/domain/entities/structures';
import { DeliveryMode, ShippingClass } from 'src/domain/enums/orders';
import { DeliveryFees } from 'src/domain/interfaces/orders';
import { ArticlesCartTypes, StreetZone } from 'src/domain/types/orders';
import { citiesServed, DoorDeliveryRules, zonesStreetMapping } from '.';
import { SharedService } from '../utilities';

type InputParameters = {
  article: ProductVariant;
  shippingClass: ShippingClass;
  deliveryMode: DeliveryMode;
  category: Category;
  street: ValueMap;
  quarter: ValueMap;
  city: ValueMap;
  region: ValueMap;
  country: ValueMap;
  postalCode: number;
};

@Injectable()
export class CalculateDeliveryFeesService {
  constructor(private readonly _sharedService: SharedService) {}

  async calculateFees(order: Order): Promise<DeliveryFees> {
    const allDeliveryFees: DeliveryFees[] = [];

    /**
     * Get deliveryFees for each article contaning in order
     * And push on allDeliveryFees
     */
    for (const articleOrdered of order.articleOrdereds) {
      const { quantity, productVariant, ...datas } = articleOrdered;

      for (let i = 0; i < quantity; i++) {
        const fees = await this._shippingAmountByArticle(order, productVariant);
        allDeliveryFees.push(fees);
      }
    }

    /**
     * Get the general deliveryFees following shipping rules
     */
    const deliveryFees = await this._shippingAmountByRule(
      allDeliveryFees,
      order,
    );

    return deliveryFees;
  }

  private async _shippingAmountByArticle(
    order: Order,
    article: ProductVariant,
  ): Promise<DeliveryFees> {
    try {
      const deliveryFees: DeliveryFees = { amount: 0, negociable: true };

      if (!order.deliveryAddress) {
        throw new NotFoundException(`Delivery address is missing`);
      }

      const { postalCode, street, quarter, city, region, country, ...datas } =
        order.deliveryAddress;

      const params: InputParameters = {
        article,
        shippingClass: article.shippingClass,
        deliveryMode: order.deliveryMode,
        category: article.product.categories[0],
        street,
        quarter,
        city,
        region,
        country,
        postalCode,
      };

      if (params.deliveryMode === DeliveryMode.IN_AGENCY) {
        deliveryFees.negociable = false;

        if (params.shippingClass === ShippingClass.SUPER_LARGE) {
          deliveryFees.amount = 500;
        } else if (params.shippingClass === ShippingClass.EXTRA_LARGE) {
          deliveryFees.amount = 1000;
        } else {
          deliveryFees.amount = 0;
        }
      } else {
        if (
          this._sharedService.toLowerCaseAndNormalize(params.city?.name) ===
            'douala' ||
          this._sharedService.toLowerCaseAndNormalize(params.city?.name) ===
            'yaounde'
        ) {
          if (params.shippingClass === ShippingClass.EXTRA_LARGE) {
            console.log(
              `Add code Here: ${CalculateDeliveryFeesService?.name} line 96`,
            );
          } else {
            const streetZone = await this._getStreetZone(
              params.quarter,
              params.city,
            );

            deliveryFees.amount = DoorDeliveryRules.door_delivery
              .find(
                (rule) =>
                  this._sharedService.toLowerCaseAndNormalize(rule.city) ===
                  this._sharedService.toLowerCaseAndNormalize(streetZone.city),
              )
              ?.zones.find((zone) => zone?.name === streetZone.zone)
              ?.shippings?.find(
                (shipping) => shipping.shipping_class === params.shippingClass,
              ).value;
            if (!deliveryFees.amount) deliveryFees.amount = 0;
            deliveryFees.negociable = false;
          }
        } else {
          if (params.shippingClass === ShippingClass.EXTRA_LARGE) {
            deliveryFees.amount = 0;
            deliveryFees.negociable = true;
          } else {
            if (citiesServed.includes(params.city?.name)) {
              deliveryFees.amount = DoorDeliveryRules.door_delivery
                ?.find((group) => group.city === 'Autres')
                ?.types?.find((type) => type.value === 'desservies')
                ?.regions?.find(
                  (region) => region?.name === params.region?.name,
                )
                ?.cities?.find((city) => city?.name === params.city?.name)
                ?.shippings?.find(
                  (shipping) =>
                    shipping.shipping_class === params.shippingClass,
                ).value;
              deliveryFees.negociable = false;
            } else {
              deliveryFees.amount = DoorDeliveryRules.door_delivery
                ?.find((group) => group.city === 'Autres')
                ?.types?.find((type) => type.value === 'non desservies')
                ?.regions?.find(
                  (region) => region?.name === params.region?.name,
                )
                ?.cities[0]?.shippings?.find(
                  (shipping) =>
                    shipping.shipping_class === params.shippingClass,
                ).value;
              deliveryFees.negociable = false;
            }
          }
        }
      }

      return deliveryFees;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured: ${error.message}`,
      );
    }
  }

  private async _shippingAmountByRule(
    input: DeliveryFees[],
    order: Order,
  ): Promise<DeliveryFees> {
    try {
      const globalDeliveryFees: DeliveryFees = { amount: 0, negociable: true };

      const isNegotiableItem = input.find(
        (shipping) => shipping.negociable === true,
      );

      if (isNegotiableItem) {
        globalDeliveryFees.amount = 0;
        globalDeliveryFees.negociable = true;
      } else {
        const totalCart = await this._calculateTotalCart(order);

        if (totalCart >= 1000000) {
          globalDeliveryFees.amount = 0;
          globalDeliveryFees.negociable = false;
        } else {
          globalDeliveryFees.negociable = false;

          const deliveryFeesAmounts: number[] = [];

          input.map((fees) => deliveryFeesAmounts.push(fees.amount));

          const totalArticles: number[] = [];

          order.articleOrdereds.map((articleOrdered) =>
            totalArticles.push(articleOrdered.quantity),
          );

          const countArticles = totalArticles.reduce(
            (sum, current) => sum + current,
            0,
          );

          /**
           * If the cart contains only one FMCG item
           */
          if (countArticles <= 1) {
            globalDeliveryFees.amount = deliveryFeesAmounts[0];
          } else {
            /**
             * If only other products
             */
            const response = await this._getFmcgCategories(order);
            console.log('Is others products response ==== ', response);

            if (response.isOnlyOthers) {
              // Total deliveryCost
              globalDeliveryFees.amount =
                await this._getOtherArticlesShippingAmount(
                  deliveryFeesAmounts,
                  countArticles,
                );
            } else if (response.isMixed) {
              /**
               * If cart contains mixture of FMCG and others articles
               */
              const totalFmcg = response.totalFmcgArticles;
              const totalOthers = countArticles - totalFmcg;

              /**
               * We have 1 FMCG and 1 other
               */
              if (totalFmcg === 1 && totalOthers === 1) {
                /**
                 * If other is greater than EXTRA_SMALL : take the deliveryCost of other article
                 * Else take the deliveryCost of FMCG article
                 */
                let otherArticle: ProductVariant;
                let fmcgArticle: ProductVariant;

                order.articleOrdereds.map(async (articleOrdered) => {
                  const fmcg = await this._getFmcgCategoriesByArticle(
                    articleOrdered.productVariant,
                  );

                  if (fmcg.length === 0) {
                    otherArticle = articleOrdered.productVariant;
                  } else {
                    fmcgArticle = articleOrdered.productVariant;
                  }
                });

                if (otherArticle?.shippingClass > ShippingClass.EXTRA_LARGE) {
                  globalDeliveryFees.amount = (
                    await this._shippingAmountByArticle(order, otherArticle)
                  ).amount;
                } else {
                  globalDeliveryFees.amount = (
                    await this._shippingAmountByArticle(order, fmcgArticle)
                  ).amount;
                }
              } else if (totalOthers === 1) {
                // We have only 1 other article and many fmcg articles
                /**
                 * If other is more than or equal to MEDIUM: take shippingCost of other
                 * Else take sum of shippingCost of fmcg
                 */
                let otherArticle: ProductVariant;
                const totalFmcgDeliveryFeesAmounts: number[] = [];
                order.articleOrdereds.map(async (articleOrdered) => {
                  const fmcgCategories = await this._getFmcgCategoriesByArticle(
                    articleOrdered.productVariant,
                  );

                  if (fmcgCategories.length === 0) {
                    otherArticle = articleOrdered.productVariant;
                  } else {
                    totalFmcgDeliveryFeesAmounts.push(
                      (
                        await this._shippingAmountByArticle(
                          order,
                          articleOrdered.productVariant,
                        )
                      ).amount,
                    );
                  }
                });

                if (otherArticle?.shippingClass > ShippingClass.MEDIUM) {
                  globalDeliveryFees.amount = (
                    await this._shippingAmountByArticle(order, otherArticle)
                  ).amount;
                } else {
                  globalDeliveryFees.amount = Math.max(
                    ...totalFmcgDeliveryFeesAmounts,
                  );
                }
              } else {
                const totalDeliveryFeesAmounts: number[] = [];

                order.articleOrdereds.map(async (articleOrdered) => {
                  const fmcgCategories = await this._getFmcgCategoriesByArticle(
                    articleOrdered.productVariant,
                  );

                  if (fmcgCategories.length === 0) {
                    totalDeliveryFeesAmounts.push(
                      (
                        await this._shippingAmountByArticle(
                          order,
                          articleOrdered.productVariant,
                        )
                      ).amount,
                    );
                  }
                });

                globalDeliveryFees.amount =
                  await this._getOtherArticlesShippingAmount(
                    totalDeliveryFeesAmounts,
                    totalOthers,
                  );
              }
            } else {
              /**
               * If only FMCG
               */
              // If the cart contains 2 or more than 2 items, take the shippingAmount of the biggest item
              globalDeliveryFees.amount = Math.max(...deliveryFeesAmounts);
            }
          }
        }
      }

      return globalDeliveryFees;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occured: ${error.message}`,
      );
    }
  }

  private async _getStreetZone(
    quarter: ValueMap,
    city: ValueMap,
  ): Promise<StreetZone> {
    const cityMaps = zonesStreetMapping.find(
      (zoneStreet) => zoneStreet.city === city?.name,
    );

    const zoneMap = cityMaps?.zones.find((zone) =>
      zone.value.find((val) => val === quarter?.name),
    );

    const zone = zoneMap ? zoneMap?.name : cityMaps?.zones[0]?.name;

    const streetZone: StreetZone = { city: city?.name, zone };

    return streetZone;
  }

  private async _calculateTotalCart(order: Order): Promise<number> {
    const prices: number[] = [];

    order.articleOrdereds.map((articleOrdered) => {
      prices.push(articleOrdered.totalPrice);
    });

    const totalCart = prices.reduce((sum, current) => sum + current, 0);

    return totalCart;
  }

  private async _getFmcgCategories(order: Order): Promise<ArticlesCartTypes> {
    const response: ArticlesCartTypes = {
      isOnlyOthers: false,
      isMixed: false,
      totalFmcgArticles: 0,
    };

    const totalFmcgCategories: Category[] = [];
    const totalFmcgArticles: number[] = [];

    order.articleOrdereds.map(async (articleOrdered) => {
      const fmcgCategoriesByArticle = await this._getFmcgCategoriesByArticle(
        articleOrdered.productVariant,
      );

      fmcgCategoriesByArticle.map((fmcgCategory) => {
        totalFmcgCategories.push(fmcgCategory);
        totalFmcgArticles.push(articleOrdered.quantity);
      });
    });

    response.totalFmcgArticles = totalFmcgArticles.reduce(
      (sum, current) => sum + current,
      0,
    );
    if (totalFmcgCategories.length === 0) {
      response.isOnlyOthers = true;
      response.isMixed = false;
    } else if (totalFmcgCategories.length === order.articleOrdereds.length) {
      response.isOnlyOthers = false;
      response.isMixed = false;
    } else {
      response.isOnlyOthers = false;
      response.isMixed = true;
    }

    return response;
  }

  private async _getFmcgCategoriesByArticle(
    article: ProductVariant,
  ): Promise<Category[]> {
    const fmcgCategories: Category[] = [];

    article.product.categories.map((category) => {
      if (category.isFmcg) fmcgCategories.push(category);
    });

    return fmcgCategories;
  }

  private async _getOtherArticlesShippingAmount(
    shippingAmounts: number[],
    countArticles: number,
  ): Promise<number> {
    let ratio = 0;
    let amount: number;

    const totalShippingCost = shippingAmounts.reduce(
      (sum, current) => sum + current,
      0,
    );

    if (countArticles === 2) {
      // If the cart contains 2 items: take 80% of total shippingCost
      ratio = 80 / 100;
      amount = ratio * totalShippingCost;
    } else if (countArticles === 3) {
      // the cart contains 3 items : take 75% of total
      ratio = 75 / 100;
      amount = ratio * totalShippingCost;
    } else {
      // the cart contains more than 3 items : take the biggest shippingCost
      amount = Math.max(...shippingAmounts);
    }

    return amount;
  }
}
