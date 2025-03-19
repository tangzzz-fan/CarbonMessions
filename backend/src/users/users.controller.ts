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

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

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
} 