import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.permissions) throw new ForbiddenException('Access denied');

    const hasAll = requiredPermissions.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(`Required permission: ${requiredPermissions.join(' or ')}`);
    }
    return true;
  }
}
