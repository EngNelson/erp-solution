import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  Abilities,
  AgentRoles,
  ApiRessources,
  IS_PUBLIC_KEY,
  PRIVILEGES_KEY,
  RESOURCE_KEY,
  UserCon,
  UserPermissions,
} from '@glosuite/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const ressource = this.reflector.getAllAndOverride<ApiRessources>(
      RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requirePrivileges = this.reflector.getAllAndOverride<Abilities[]>(
      PRIVILEGES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ressource && !requirePrivileges) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserCon;

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.roles.some((role) => role === AgentRoles.SUPER_ADMIN)) {
      return true;
    }

    const userHavePrivileges = user.permissions.some(
      (permission: UserPermissions) =>
        permission.ressource.includes(ressource) &&
        requirePrivileges.some((privilege) =>
          permission.abilities.includes(privilege),
        ),
    );

    return userHavePrivileges;
  }
}
