import { Injectable } from '@nestjs/common';
import { DbBaseEntity, IIEntityReferenceService } from '@glosuite/shared';

@Injectable()
export class IEntityReferenceService implements IIEntityReferenceService {
  async generate<T extends DbBaseEntity>(type: new () => T): Promise<string> {
    let base = type.name.substr(0, 3).toUpperCase();
    if (base.length < 3) {
      base = base.padEnd(3, 'X');
    }

    const date = new Date();

    return `${base}-${this._getDateRef()}`;
  }

  /**
   *
   * @returns
   */
  private _getDateRef(): string {
    const date = new Date();

    let month: any = date.getMonth() + 1;
    month = month < 10 ? `0${month}` : month;

    let day: any = date.getDate();
    day = day < 9 ? `0${day}` : day;

    let hour: any = date.getHours();
    hour = hour < 9 ? `0${hour}` : hour;

    let minutes: any = date.getMinutes();
    minutes = minutes < 9 ? `0${minutes}` : minutes;

    let seconds: any = date.getSeconds();
    seconds = seconds < 9 ? `0${seconds}` : seconds;

    return `${date.getFullYear()}${month}${day}${hour}${minutes}${seconds}`;
  }
}
