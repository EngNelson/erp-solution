import { Injectable } from '@nestjs/common';
import { MiniUserCon, UserCon } from '@glosuite/shared';
import { MiniUserPayload } from 'src/domain/interfaces';

@Injectable()
export class UserService {
  getMiniUserCon(user: UserCon): MiniUserCon {
    const miniUser: MiniUserCon = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      sellerCode: user.sellerCode,
      workStation: user.workStation,
    };

    return miniUser;
  }

  buildMiniUserPayload(user: UserCon): MiniUserPayload {
    const userPayload: MiniUserPayload = {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    };
    return userPayload;
  }
}
