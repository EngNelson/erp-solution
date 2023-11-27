import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  MTARGET_API_URL,
  MTARGET_PASSWORD,
  MTARGET_USERNAME,
  SMS_SENDER,
} from 'src/domain/constants';
import { Order } from 'src/domain/entities/orders';
import { Address } from 'src/domain/entities/shared';
import { MessageType, SendSMSResult } from 'src/domain/enums/sms';

@Injectable()
export class SendingSMSService {
  constructor(private readonly _httpService: HttpService) {}

  async sendSMS(order: Order, type: MessageType): Promise<SendSMSResult> {
    try {
      const msg = this._buildSMSMessage(type, order.deliveryAddress, order);
      const msisdn = this._phoneTreatment(order.deliveryAddress.phone);
      const phone = parseInt(msisdn.toString());

      if (Number.isNaN(phone) || msisdn.length !== 13) {
        console.log(`Cannot send sms to the phone number: ${msisdn}.`);
        return SendSMSResult.FAILURE;
      } else {
        const url = `${MTARGET_API_URL}?username=${MTARGET_USERNAME}&password=${MTARGET_PASSWORD}&msg=${encodeURIComponent(
          msg,
        )}&msisdn=${encodeURIComponent(msisdn)}&sender=${SMS_SENDER}`;

        await this._httpService.axiosRef
          .get(url)
          .then((response) => {
            console.log(
              `A SMS have successfully been sent to ${msisdn}. - ${response.data}`,
            );
            return SendSMSResult.SUCCESS;
          })
          .catch((error) => {
            console.log(`An error has occurred - ${error.message}`);
            return SendSMSResult.FAILURE;
          });
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        `${SendingSMSService.name} = ${this.sendSMS.name} - ${error}`,
      );
    }
  }

  private _buildSMSMessage(
    type: MessageType,
    address: Address,
    order: Order,
  ): string {
    let message: string;

    if (type === MessageType.ORDER_READY) {
      message = `Bonjour M/Mme ${address.fullName}, votre commande ${order.reference} est prete, Veuillez vous rendre a notre agence de ${order.storagePoint.name} pour recuperer votre colis.\n Merci! \n\n Hello Mr/Mrs ${address.fullName}, your order ${order.reference} is ready, Please go to our office in ${order.storagePoint.name} to pick up your parcel. \n Thank you!`;
    }

    return message;
  }

  private _phoneTreatment(originalPhone: string): string {
    const phone = `+237${originalPhone
      .trim()
      .replace('+237', '')
      .replace('00237', '')
      .replace('LIVRE', '')}`;

    const msisdn = phone.slice(0, 13);

    console.log('The phone number =============== ', msisdn);

    return msisdn;
  }
}
