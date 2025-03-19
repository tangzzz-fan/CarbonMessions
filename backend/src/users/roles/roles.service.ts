import { Injectable } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../constants/permissions.constant';

@Injectable()
export class RolesService {
    // 定义角色层级，数字越大权限越高
    private readonly roleHierarchy: { [key in Role]: number } = {
        [Role.ADMIN]: 100,    // 管理员最高权限
        [Role.MANAGER]: 80,   // 管理者次高权限
        [Role.OPERATOR]: 60,  // 操作员
        [Role.VIEWER]: 40,    // 查看者
        [Role.USER]: 20,      // 普通用户
        [Role.GUEST]: 0       // 访客最低权限
    };

    // 角色描述信息
    private readonly roleDescriptions: { [key in Role]: { name: string, description: string } } = {
        [Role.ADMIN]: { name: '管理员', description: '系统管理员，拥有所有权限' },
        [Role.MANAGER]: { name: '管理人员', description: '管理人员，可进行大部分管理操作' },
        [Role.OPERATOR]: { name: '操作员', description: '操作员，负责数据录入和基本操作' },
        [Role.VIEWER]: { name: '查看者', description: '查看者，只能查看数据' },
        [Role.USER]: { name: '普通用户', description: '普通用户，权限非常有限' },
        [Role.GUEST]: { name: '访客', description: '访客，只能查看公开信息' }
    };

    /**
     * 获取所有角色
     */
    getAllRoles(): Role[] {
        return Object.values(Role);
    }

    /**
     * 获取角色的详细信息列表
     */
    getAllRolesInfo(): { name: string, value: Role, description: string }[] {
        return this.getAllRoles().map(role => ({
            name: this.roleDescriptions[role].name,
            value: role,
            description: this.roleDescriptions[role].description
        }));
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
     * 获取角色的层级值
     */
    getRoleHierarchy(role: Role): number {
        return this.roleHierarchy[role] || 0;
    }

    /**
     * 检查一个角色是否可以管理另一个角色
     */
    canManageRole(managerRole: Role, targetRole: Role): boolean {
        if (managerRole === targetRole) {
            return false;
        }

        if (managerRole === Role.ADMIN && targetRole !== Role.ADMIN) {
            return true;
        }

        const managerHierarchy = this.getRoleHierarchy(managerRole);
        const targetHierarchy = this.getRoleHierarchy(targetRole);

        return managerHierarchy > targetHierarchy;
    }

    /**
     * 检查一个角色是否至少与另一个角色具有相同的权限级别
     */
    isRoleAtLeastAsHighAs(role: Role, targetRole: Role): boolean {
        const roleHierarchy = this.getRoleHierarchy(role);
        const targetHierarchy = this.getRoleHierarchy(targetRole);
        return roleHierarchy >= targetHierarchy;
    }

    /**
     * 获取指定角色可以管理的所有角色
     */
    getManageableRoles(role: Role): Role[] {
        return this.getAllRoles()
            .filter(targetRole => this.canManageRole(role, targetRole));
    }
} 