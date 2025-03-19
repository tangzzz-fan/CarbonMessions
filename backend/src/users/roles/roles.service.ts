import { Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../constants/permissions.constant';

@Injectable()
export class RolesService {
    /**
     * 获取所有角色列表
     */
    getAllRoles(): { name: string, value: string, description: string }[] {
        return [
            { name: '管理员', value: Role.ADMIN, description: '系统管理员，拥有所有权限' },
            { name: '管理人员', value: Role.MANAGER, description: '管理人员，可进行大部分管理操作' },
            { name: '操作员', value: Role.OPERATOR, description: '操作员，负责数据录入和基本操作' },
            { name: '查看者', value: Role.VIEWER, description: '查看者，只有只读权限' },
            { name: '普通用户', value: Role.USER, description: '普通用户，权限非常有限' },
        ];
    }

    /**
     * 获取角色详情，包括权限列表
     */
    getRoleDetails(role: Role): { role: string, permissions: string[] } {
        const permissions = ROLE_PERMISSIONS[role] || [];
        return {
            role,
            permissions,
        };
    }

    /**
     * 判断一个角色是否有特定权限
     */
    hasPermission(role: Role, permission: string): boolean {
        const permissions = ROLE_PERMISSIONS[role] || [];
        return permissions.includes(permission);
    }

    /**
     * 获取角色层级关系，用于权限判断
     * 返回值越大表示权限越高
     */
    getRoleHierarchy(role: Role): number {
        const hierarchy = {
            [Role.ADMIN]: 50,
            [Role.MANAGER]: 40,
            [Role.OPERATOR]: 30,
            [Role.VIEWER]: 20,
            [Role.USER]: 10,
        };

        return hierarchy[role] || 0;
    }

    /**
     * 检查targetRole是否可以被currentRole修改
     * 规则：用户只能修改权限低于自己的角色
     */
    canManageRole(currentRole: Role, targetRole: Role): boolean {
        return this.getRoleHierarchy(currentRole) > this.getRoleHierarchy(targetRole);
    }
} 