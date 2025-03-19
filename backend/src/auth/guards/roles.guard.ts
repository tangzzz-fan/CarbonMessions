import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../users/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesService } from '../../users/roles/roles.service';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private rolesService: RolesService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!user) {
            return false; // 如果没有用户对象，拒绝访问
        }

        // 支持单个角色或角色数组
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];

        return requiredRoles.some((requiredRole) => {
            if (!requiredRole) return false;

            const requiredRoleHierarchy = this.rolesService.getRoleHierarchy(requiredRole);

            return userRoles.some(userRole => {
                if (!userRole) return false;
                const userRoleHierarchy = this.rolesService.getRoleHierarchy(userRole);
                return userRoleHierarchy >= requiredRoleHierarchy;
            });
        });
    }
} 