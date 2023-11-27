import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import {
  MAGENTO_BASE_API_URL,
  MAGENTO_STOCK_SYNC,
  MAGENTO_USER_TOKEN,
  PUT_PRODUCTS,
  UPDATE_MAGENTO_ORDER_STATUS,
} from 'src/domain/constants';
import { SharedService } from '../utilities';
import { ProductVariant } from 'src/domain/entities/items';
import { AllowAction, MagentoOrderStatus } from 'src/domain/enums/magento';
import { UpdateOrderStatusBody } from 'src/domain/interfaces/magento';

@Injectable()
export class UpdateMagentoDataService {
  constructor(
    private readonly _httpService: HttpService,
    private readonly _sharedService: SharedService,
  ) {}

  updateProductsQuantities(variants: ProductVariant[]) {
    if (
      MAGENTO_STOCK_SYNC === AllowAction.ON &&
      variants &&
      variants.length > 0
    ) {
      for (const variant of variants) {
        const quantity =
          variant.quantity.available + variant.quantity.discovered;

        const path =
          MAGENTO_BASE_API_URL +
          this._sharedService.buildURL(PUT_PRODUCTS, null, variant.magentoSKU);

        console.log(path);

        const payload = {
          product: {
            extension_attributes: {
              stock_item: {
                qty: quantity,
                is_in_stock: quantity > 0 ? true : false,
                manage_stock: true,
              },
            },
          },
        };

        this._httpService.axiosRef
          .put(path, payload, {
            headers: {
              Authorization: `Bearer ${MAGENTO_USER_TOKEN}`,
              'Content-Type': 'application/json',
            },
          })
          .then((response) => {
            console.log(
              `${response.config.method} on ${response.config.url}. NewQty=${
                response.data.extension_attributes.stock_item.qty +
                ' - isInStock=' +
                response.data.extension_attributes.stock_item.is_in_stock +
                ' - manage stock=' +
                response.data.extension_attributes.stock_item.manage_stock
              }, Result=${response.statusText}`,
            );
          })
          .catch((error) => {
            console.log(
              `${error.syscall} - ${error.code} : errno = ${error.errno}. ${error}`,
            );
          });
      }
    }
  }

  updateSingleProductQty(magentoSKU: string, quantity: number) {
    if (MAGENTO_STOCK_SYNC === AllowAction.ON) {
      const path =
        MAGENTO_BASE_API_URL +
        this._sharedService.buildURL(PUT_PRODUCTS, null, magentoSKU);

      console.log(path);

      const payload = {
        product: {
          extension_attributes: {
            stock_item: {
              qty: quantity,
              is_in_stock: quantity > 0 ? true : false,
              manage_stock: true,
            },
          },
        },
      };

      this._httpService.axiosRef
        .put(path, payload, {
          headers: {
            Authorization: `Bearer ${MAGENTO_USER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        .then((response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. NewQty=${
              response.data.extension_attributes.stock_item.qty +
              ' - isInStock=' +
              response.data.extension_attributes.stock_item.is_in_stock +
              ' - manage stock=' +
              response.data.extension_attributes.stock_item.manage_stock
            }, Result=${response.statusText}`,
          );
        })
        .catch((error) => {
          console.log(
            `${error.syscall} - ${error.code} : errno = ${error.errno}. ${error}`,
          );
        });
    }
  }

  updateOrderStatus(orderId: number, newStatus: MagentoOrderStatus) {
    if (UPDATE_MAGENTO_ORDER_STATUS === AllowAction.ON) {
      const path = `${MAGENTO_BASE_API_URL}gt/order/${orderId}/update-status`;

      console.log(path);

      const body: UpdateOrderStatusBody = {
        gt_user: 'ERP',
        new_status: newStatus,
      };

      this._httpService.axiosRef
        .post(path, body, {
          headers: {
            Authorization: `Bearer ${MAGENTO_USER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        })
        .then((response) => {
          console.log(
            `${response.config.method} on ${response.config.url}. Result=${response.statusText}`,
          );
        })
        .catch((error) => {
          console.log(
            `${error.syscall} - ${error.code} : errno = ${error.errno}. ${error}`,
          );
        });
    }
  }
}
