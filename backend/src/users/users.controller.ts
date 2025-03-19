import {
    Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,
    Request, Query, BadRequestException, HttpCode, NotFoundException,
    ForbiddenException, ConflictException, HttpStatus
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from './constants/permissions.constant';
import { Role } from './enums/role.enum';
import { RolesService } from './roles/roles.service';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly rolesService: RolesService,
    ) { }

    @Post()
    @Roles(Role.ADMIN)
    @Permissions(PERMISSIONS.USER_CREATE)
    @ApiOperation({ summary: '创建用户' })
    @ApiResponse({ status: 201, description: '用户创建成功' })
    @ApiResponse({ status: 400, description: '请求数据无效' })
    @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(Role.ADMIN, Role.MANAGER)
    @Permissions(PERMISSIONS.USER_READ)
    @ApiOperation({ summary: '获取所有用户' })
    @ApiResponse({ status: 200, description: '返回用户列表' })
    @ApiQuery({ name: 'role', required: false, description: '按角色过滤' })
    @ApiQuery({ name: 'isActive', required: false, description: '按激活状态过滤' })
    @ApiQuery({ name: 'department', required: false, description: '按部门过滤' })
    findAll(
        @Query('role') role?: string,
        @Query('isActive') isActive?: boolean,
        @Query('department') department?: string,
    ) {
        const filters = {};
        if (role) filters['role'] = role;
        if (isActive !== undefined) filters['isActive'] = isActive;
        if (department) filters['department'] = department;

        return this.usersService.findAll(filters);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.USER_READ)
    @ApiOperation({ summary: '通过ID获取用户' })
    @ApiResponse({ status: 200, description: '返回用户信息' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    findOne(@Param('id') id: string, @Request() req) {
        // 普通用户只能查看自己的信息，管理员可以查看所有用户
        if (req.user.role !== Role.ADMIN && req.user.id !== id) {
            throw new ForbiddenException('您没有权限查看其他用户的信息');
        }
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: '更新用户信息' })
    @ApiResponse({ status: 200, description: '用户更新成功' })
    @ApiResponse({ status: 400, description: '请求数据无效' })
    @ApiResponse({ status: 403, description: '没有权限更新此用户' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
        // 普通用户只能更新自己的信息，管理员可以更新所有用户
        if (req.user.role !== Role.ADMIN && req.user.id !== id) {
            throw new ForbiddenException('您没有权限更新其他用户的信息');
        }

        // 只有管理员可以更改用户角色
        if (updateUserDto.role && req.user.role !== Role.ADMIN) {
            throw new ForbiddenException('只有管理员可以更改用户角色');
        }

        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @Permissions(PERMISSIONS.USER_DELETE)
    @ApiOperation({ summary: '删除用户' })
    @ApiResponse({ status: 200, description: '用户删除成功' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '修改密码' })
    @ApiResponse({ status: 200, description: '密码修改成功' })
    @ApiResponse({ status: 400, description: '当前密码不正确' })
    async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req) {
        return this.usersService.changePassword(
            req.user.id,
            changePasswordDto.currentPassword,
            changePasswordDto.newPassword,
        );
    }

    @Get('profile/me')
    @ApiOperation({ summary: '获取当前用户信息' })
    @ApiResponse({ status: 200, description: '返回当前用户信息' })
    getProfile(@Request() req) {
        return this.usersService.findOne(req.user.id);
    }

    @Patch('profile/me')
    @ApiOperation({ summary: '更新当前用户信息' })
    @ApiResponse({ status: 200, description: '用户信息更新成功' })
    updateProfile(@Body() updateUserDto: UpdateUserDto, @Request() req) {
        // 不允许用户自行修改角色
        if (updateUserDto.role) {
            throw new ForbiddenException('不允许自行修改用户角色');
        }
        return this.usersService.update(req.user.id, updateUserDto);
    }

    @Patch(':id/role')
    @Roles(Role.ADMIN)
    @Permissions(PERMISSIONS.USER_UPDATE)
    @ApiOperation({ summary: '更改用户角色' })
    @ApiResponse({ status: 200, description: '角色更新成功' })
    @ApiResponse({ status: 403, description: '没有权限更改为该角色' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    async updateUserRole(
        @Param('id') id: string,
        @Body('role') newRole: Role,
        @Request() req
    ) {
        // 检查要分配的角色是否有效
        if (!Object.values(Role).includes(newRole)) {
            throw new BadRequestException('无效的角色');
        }

        // 检查管理员是否有权限分配该角色
        // 管理员不能分配与自己同级或更高级的角色
        if (!this.rolesService.canManageRole(req.user.role, newRole)) {
            throw new ForbiddenException('您没有权限分配该角色');
        }

        // 获取用户
        const user = await this.usersService.findOne(id);

        // 管理员不能修改比自己权限高的用户
        if (!this.rolesService.canManageRole(req.user.role, user.role)) {
            throw new ForbiddenException('您没有权限修改该用户');
        }

        // 更新角色
        const updatedUser = await this.usersService.update(id, { role: newRole });
        return {
            message: '用户角色更新成功',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
            }
        };
    }

    @Get(':id/permissions')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: '获取用户的权限列表' })
    @ApiResponse({ status: 200, description: '返回用户的权限列表' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    async getUserPermissions(@Param('id') id: string) {
        const user = await this.usersService.findOne(id);
        const roleDetails = this.rolesService.getRoleDetails(user.role as Role);

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            permissions: roleDetails.permissions
        };
    }

    @Get('role/:role')
    @Roles(Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: '获取特定角色的所有用户' })
    @ApiResponse({ status: 200, description: '返回用户列表' })
    async getUsersByRole(@Param('role') role: Role) {
        if (!Object.values(Role).includes(role)) {
            throw new BadRequestException('无效的角色');
        }

        const users = await this.usersService.findAll({ role });
        return users;
    }
} 