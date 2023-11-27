import { AgentRoles, UserCon, UserPermissions } from '@glosuite/shared';

export class UserItemOutput {
  constructor(user: UserCon) {
    this.email = user.email;
    this.phone = user.phone;
    this.firstname = user.firstname;
    this.lastname = user.lastname;
    this.roles = user.roles;
    this.permissions = user.permissions;
  }

  email: string;
  phone: string;
  firstname: string;
  lastname: string;
  roles: AgentRoles[];
  permissions: UserPermissions[];
}
