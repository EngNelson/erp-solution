import { Injectable } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SyncType } from 'src/domain/enums/magento';

@Injectable()
export class SyncConfigs {
  setCronTimeout(timeoutValue: number): string {
    if (timeoutValue === 30) return CronExpression.EVERY_30_SECONDS;
    if (timeoutValue === 60) return CronExpression.EVERY_MINUTE;
    if (timeoutValue === 300) return CronExpression.EVERY_5_MINUTES;

    const value = timeoutValue / 60;
    if (value % 2 === 0) {
      return `0 */${value} * * * *`;
    } else {
      return `*/${timeoutValue} * * * * *`;
    }
  }

  startingMessage(timeoutValue: number, syncType: SyncType): string {
    const minutes = timeoutValue / 60;
    const insert = minutes % 2 == 0 ? minutes : timeoutValue;
    const message = `Called the service to import ${syncType} from Magento every ${insert} ${this._setTimeUnit(
      minutes,
    )}`;
    return message;
  }

  private _setTimeUnit(minutes: number): string {
    if (minutes < 1 || minutes % 2 != 0) return 'seconds';
    return `${minutes > 1 ? 'minutes' : 'minute'}`;
  }
}
