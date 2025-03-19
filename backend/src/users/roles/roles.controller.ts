import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @ApiOperation({ summary: '获取所有角色' })
    @ApiResponse({ status: 200, description: '返回所有角色列表' })
    getAllRoles() {
        return this.rolesService.getAllRoles();
    }

    @Get(':role')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: '获取指定角色的详细信息' })
    @ApiResponse({ status: 200, description: '返回角色详情和权限列表' })
    getRoleDetails(@Param('role') role: Role) {
        return this.rolesService.getRoleDetails(role);
    }

    @Get(':role/permissions')
    @ApiOperation({ summary: '获取指定角色的权限列表' })
    @ApiResponse({ status: 200, description: '返回角色的权限列表' })
    getRolePermissions(@Param('role') role: Role) {
        const details = this.rolesService.getRoleDetails(role);
        return { permissions: details.permissions };
    }
} 