import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../constants/permissions.constant';

@ApiTags('权限管理')
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PermissionsController {
    @Get()
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: '获取所有权限定义' })
    @ApiResponse({ status: 200, description: '返回所有权限常量' })
    getAllPermissions() {
        // 将权限对象转换为数组格式，便于前端使用
        const permissionsArray = Object.entries(PERMISSIONS).map(([key, value]) => ({
            key,
            value,
            description: this.getPermissionDescription(value),
        }));

        return permissionsArray;
    }

    @Get('roles')
    @ApiOperation({ summary: '获取角色-权限映射' })
    @ApiResponse({ status: 200, description: '返回角色-权限映射' })
    getRolePermissions() {
        return ROLE_PERMISSIONS;
    }

    private getPermissionDescription(permission: string): string {
        // 根据权限值提供描述
        const descriptionMap = {
            'user:create': '创建用户',
            'user:read': '查看用户',
            'user:update': '更新用户',
            'user:delete': '删除用户',
            'device:create': '创建设备',
            'device:read': '查看设备',
            'device:update': '更新设备',
            'device:delete': '删除设备',
            'data:create': '创建数据',
            'data:read': '查看数据',
            'data:update': '更新数据',
            'data:delete': '删除数据',
            'report:access': '访问报表',
            'report:export': '导出报表',
            'analytics:access': '访问分析',
            'settings:access': '访问设置',
            'settings:update': '更新设置',
        };

        return descriptionMap[permission] || permission;
    }
} 