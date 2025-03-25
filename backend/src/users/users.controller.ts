import {
    Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,
    Request, Query, BadRequestException, HttpCode, NotFoundException,
    ForbiddenException, ConflictException, HttpStatus, Put
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
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class RoleTransformPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (value && value.role && typeof value.role === 'string') {
            // 映射小写角色名到枚举值
            const roleMap = {
                'admin': Role.ADMIN,
                'manager': Role.MANAGER,
                'operator': Role.OPERATOR,
                'viewer': Role.VIEWER,
                'user': Role.USER
            };

            // 尝试直接映射（忽略大小写）
            const mappedRole = roleMap[value.role.toLowerCase()];
            if (mappedRole) {
                value.role = mappedRole;
            }
        }
        return value;
    }
}

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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取所有用户列表（需要权限）' })
    @ApiResponse({ status: 200, description: '成功获取用户列表' })
    @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
    @ApiQuery({ name: 'limit', required: false, description: '每页条数，默认为10' })
    @ApiQuery({ name: 'role', required: false, description: '按角色筛选' })
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('role') role?: string
    ) {
        // 确保页码和条数为正整数
        const pageNumber = Math.max(1, parseInt(page) || 1);
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit) || 10));

        // 允许通过角色过滤用户
        const filters = role ? { role } : {};

        // 获取分页数据
        const [users, total] = await this.usersService.findAllPaginated(
            filters,
            pageNumber,
            limitNumber
        );

        // 计算总页数
        const totalPages = Math.ceil(total / limitNumber);

        return {
            data: users,
            meta: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages
            }
        };
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
        const updatedUser = await this.usersService.update(id, {
            role: newRole,
            isActive: true
        });
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

    @Get('public')
    @ApiOperation({ summary: '获取公开用户列表（有限信息）' })
    @ApiResponse({ status: 200, description: '成功获取公开用户列表' })
    @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
    @ApiQuery({ name: 'limit', required: false, description: '每页条数，默认为10' })
    async findAllPublic(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        const pageNumber = Math.max(1, parseInt(page) || 1);
        const limitNumber = Math.max(1, Math.min(100, parseInt(limit) || 10));

        const [users, total] = await this.usersService.findAllPaginated({}, pageNumber, limitNumber);

        return {
            data: users.map(user => ({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                department: user.department,
                position: user.position,
            })),
            meta: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        };
    }

    @Put(':id')
    @ApiOperation({ summary: '完整更新用户信息' })
    @ApiResponse({ status: 200, description: '用户更新成功' })
    @ApiResponse({ status: 400, description: '请求数据无效' })
    @ApiResponse({ status: 403, description: '没有权限更新此用户' })
    @ApiResponse({ status: 404, description: '用户不存在' })
    async updateFull(
        @Param('id') id: string,
        @Body(new RoleTransformPipe()) updateUserDto: UpdateUserDto,
        @Request() req
    ) {
        try {
            // 记录请求详情以便调试
            console.log(`PUT /users/${id} 请求体:`, JSON.stringify(updateUserDto));

            // 权限检查逻辑与PATCH方法相同
            if (req.user.role !== Role.ADMIN && req.user.id !== id) {
                throw new ForbiddenException('您没有权限更新其他用户的信息');
            }

            // 只有管理员可以更改用户角色
            if (updateUserDto.role && req.user.role !== Role.ADMIN) {
                throw new ForbiddenException('只有管理员可以更改用户角色');
            }

            // 确保请求至少包含一个需要更新的字段
            if (Object.keys(updateUserDto).length === 0) {
                throw new BadRequestException('请求中必须包含至少一个要更新的字段');
            }

            // 调用服务方法更新用户
            const updatedUser = await this.usersService.update(id, updateUserDto);
            return updatedUser;
        } catch (error) {
            console.error(`更新用户 ${id} 失败:`, error.message);

            // 重新抛出异常，但提供更多上下文
            if (error instanceof BadRequestException) {
                throw new BadRequestException(`请求数据无效: ${error.message}`);
            }
            throw error;
        }
    }

    // 仅用于开发环境
    @Post('debug')
    @ApiOperation({ summary: '调试请求数据（仅用于开发环境）' })
    debugRequest(@Body() requestData: any) {
        console.log('收到的调试请求数据:', requestData);
        return {
            received: requestData,
            timestamp: new Date(),
            message: '请求成功接收，请检查服务器日志以获取详细信息'
        };
    }

    @Post('validate')
    @ApiOperation({ summary: '验证用户数据（调试用）' })
    async validateUserData(@Body() data: any) {
        try {
            console.log('收到的验证数据:', data);

            // 尝试转换角色（如果存在）
            if (data.role && typeof data.role === 'string') {
                // 转换为大写
                const upperRole = data.role.toUpperCase();

                // 检查是否为有效角色
                if (Object.values(Role).includes(upperRole as Role)) {
                    console.log(`角色 "${data.role}" 有效，转换为: ${upperRole}`);
                } else {
                    console.log(`角色 "${data.role}" 无效，有效值为: ${Object.values(Role).join(', ')}`);
                }
            }

            // 返回转换和验证结果
            return {
                original: data,
                validated: {
                    // 添加验证和转换结果
                    role: data.role ? data.role.toUpperCase() : undefined,
                    isActive: data.isActive,
                    status: data.status ?
                        (data.status === 'active' ? true : false) :
                        undefined
                },
                message: '验证完成，请查看服务器日志获取详细信息'
            };
        } catch (error) {
            return {
                error: error.message,
                original: data
            };
        }
    }

    @Post('role-debug')
    @ApiOperation({ summary: '调试角色转换' })
    async debugRoleTransformation(@Body() data: { role: string }) {
        try {
            // 打印原始角色值
            console.log('原始角色值:', data.role);

            // 转换为大写并检查是否有效
            const upperRole = data.role.toUpperCase();
            console.log('转换后角色值:', upperRole);

            // 检查是否为有效角色
            const isValid = Object.values(Role).includes(upperRole as Role);
            console.log('是否为有效角色:', isValid);
            console.log('有效角色值:', Object.values(Role));

            return {
                original: data.role,
                transformed: upperRole,
                valid: isValid,
                validRoles: Object.values(Role)
            };
        } catch (error) {
            return {
                error: error.message,
                data
            };
        }
    }
} 