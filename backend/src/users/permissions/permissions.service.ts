import { Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { PERMISSIONS } from '../constants/permissions.constant';

/**
 * 权限服务，用于处理权限相关的逻辑
 */
@Injectable()
export class PermissionsService {
    /**
     * 获取指定角色的权限列表
     */
    getRolePermissions(role: Role): string[] {
        // 根据角色返回对应的权限列表
        switch (role) {
            case Role.ADMIN:
                // 管理员拥有所有权限
                return Object.values(PERMISSIONS);

            case Role.MANAGER:
                // 管理者拥有大部分权限，但不包括一些高级系统设置
                return [
                    PERMISSIONS.USER_CREATE, PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE,
                    PERMISSIONS.DEVICE_CREATE, PERMISSIONS.DEVICE_READ, PERMISSIONS.DEVICE_UPDATE, PERMISSIONS.DEVICE_DELETE,
                    PERMISSIONS.DATA_CREATE, PERMISSIONS.DATA_READ, PERMISSIONS.DATA_UPDATE, PERMISSIONS.DATA_DELETE,
                    PERMISSIONS.REPORT_ACCESS, PERMISSIONS.REPORT_EXPORT,
                    PERMISSIONS.ANALYTICS_ACCESS
                ];

            case Role.OPERATOR:
                // 操作员拥有设备和数据操作权限，基本用户管理权限
                return [
                    PERMISSIONS.USER_READ,
                    PERMISSIONS.DEVICE_READ, PERMISSIONS.DEVICE_UPDATE,
                    PERMISSIONS.DATA_CREATE, PERMISSIONS.DATA_READ, PERMISSIONS.DATA_UPDATE,
                    PERMISSIONS.REPORT_ACCESS
                ];

            case Role.VIEWER:
                // 观察者只有查看权限
                return [
                    PERMISSIONS.USER_READ,
                    PERMISSIONS.DEVICE_READ,
                    PERMISSIONS.DATA_READ,
                    PERMISSIONS.REPORT_ACCESS
                ];

            case Role.USER:
                // 普通用户
                return [
                    PERMISSIONS.DEVICE_READ,
                    PERMISSIONS.DATA_READ
                ];

            default:
                // 访客没有权限
                return [];
        }
    }

    /**
     * 检查用户是否拥有指定权限
     */
    hasPermission(userRole: Role, permission: string): boolean {
        const permissions = this.getRolePermissions(userRole);
        return permissions.includes(permission);
    }

    /**
     * 检查用户是否拥有任一指定权限
     */
    hasAnyPermission(userRole: Role, permissions: string[]): boolean {
        const userPermissions = this.getRolePermissions(userRole);
        return permissions.some(permission => userPermissions.includes(permission));
    }

    /**
     * 检查用户是否拥有所有指定权限
     */
    hasAllPermissions(userRole: Role, permissions: string[]): boolean {
        const userPermissions = this.getRolePermissions(userRole);
        return permissions.every(permission => userPermissions.includes(permission));
    }
} 