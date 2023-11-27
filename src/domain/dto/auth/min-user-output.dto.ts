import { UserCon } from '@glosuite/shared';

export class MiniUserOutput {
  constructor(user: UserCon) {
    this.email = user.email;
    this.phone = user.phone;
    this.firstname = user.firstname;
    this.lastname = user.lastname;
  }

  email: string;
  phone: string;
  firstname: string;
  lastname: string;
}
