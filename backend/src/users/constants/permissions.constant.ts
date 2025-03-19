import { Role } from '../enums/role.enum';

export const PERMISSIONS = {
    // 用户管理权限
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',

    // 设备管理权限
    DEVICE_CREATE: 'device:create',
    DEVICE_READ: 'device:read',
    DEVICE_UPDATE: 'device:update',
    DEVICE_DELETE: 'device:delete',

    // 数据采集权限
    DATA_CREATE: 'data:create',
    DATA_READ: 'data:read',
    DATA_UPDATE: 'data:update',
    DATA_DELETE: 'data:delete',

    // 报表和分析权限
    REPORT_ACCESS: 'report:access',
    REPORT_EXPORT: 'report:export',
    ANALYTICS_ACCESS: 'analytics:access',

    // 系统设置权限
    SETTINGS_ACCESS: 'settings:access',
    SETTINGS_UPDATE: 'settings:update',
};

// 角色对应的权限映射
export const ROLE_PERMISSIONS = {
    [Role.ADMIN]: Object.values(PERMISSIONS), // 管理员拥有所有权限

    [Role.MANAGER]: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.DEVICE_READ,
        PERMISSIONS.DEVICE_UPDATE,
        PERMISSIONS.DATA_READ,
        PERMISSIONS.DATA_CREATE,
        PERMISSIONS.DATA_UPDATE,
        PERMISSIONS.REPORT_ACCESS,
        PERMISSIONS.REPORT_EXPORT,
        PERMISSIONS.ANALYTICS_ACCESS,
        PERMISSIONS.SETTINGS_ACCESS,
    ],

    [Role.OPERATOR]: [
        PERMISSIONS.DEVICE_READ,
        PERMISSIONS.DATA_READ,
        PERMISSIONS.DATA_CREATE,
        PERMISSIONS.DATA_UPDATE,
        PERMISSIONS.REPORT_ACCESS,
    ],

    [Role.VIEWER]: [
        PERMISSIONS.DEVICE_READ,
        PERMISSIONS.DATA_READ,
        PERMISSIONS.REPORT_ACCESS,
    ],

    [Role.USER]: [
        PERMISSIONS.DEVICE_READ,
        PERMISSIONS.DATA_READ,
    ],
}; 