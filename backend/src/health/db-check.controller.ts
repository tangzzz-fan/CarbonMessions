import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

@ApiTags('数据库检查')
@Controller('db-check')
export class DbCheckController {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    @Get('users')
    @ApiOperation({ summary: '检查用户表记录' })
    @ApiResponse({ status: 200, description: '返回用户记录' })
    @ApiQuery({ name: 'username', required: false, description: '按用户名过滤' })
    @ApiQuery({ name: 'email', required: false, description: '按邮箱过滤' })
    async checkUsers(@Query('username') username?: string, @Query('email') email?: string) {
        try {
            // 构建查询条件
            let query = this.dataSource
                .createQueryBuilder()
                .select([
                    'u.id',
                    'u.username',
                    'u.email',
                    'u.role',
                    'u.created_at',
                    'u.updated_at',
                ])
                .from(User, 'u');

            // 添加过滤条件
            if (username) {
                query = query.where('u.username = :username', { username });
            }

            if (email) {
                if (username) {
                    query = query.orWhere('u.email = :email', { email });
                } else {
                    query = query.where('u.email = :email', { email });
                }
            }

            // 执行查询
            const users = await query.getMany();

            return {
                count: users.length,
                users: users
            };
        } catch (error) {
            return {
                status: 'error',
                message: '查询失败',
                error: error.message,
            };
        }
    }

    @Get('users-count')
    @ApiOperation({ summary: '检查用户总数' })
    @ApiResponse({ status: 200, description: '返回用户数量' })
    async countUsers() {
        try {
            const count = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)', 'count')
                .from(User, 'u')
                .getRawOne();

            return {
                status: 'ok',
                count: count.count,
            };
        } catch (error) {
            return {
                status: 'error',
                message: '查询失败',
                error: error.message,
            };
        }
    }

    @Get('test-user')
    @ApiOperation({ summary: '创建测试用户' })
    @ApiResponse({ status: 200, description: '返回创建结果' })
    async createTestUser() {
        try {
            // 检查测试用户是否已存在
            const existingUser = await this.dataSource
                .createQueryBuilder()
                .select('u.id')
                .from(User, 'u')
                .where('u.username = :username', { username: 'testadmin' })
                .getOne();

            if (existingUser) {
                return {
                    status: 'info',
                    message: '测试用户已存在',
                    userId: existingUser.id,
                };
            }

            // 创建测试用户（使用bcrypt哈希的密码）
            // 密码是 'admin123'，对应的bcrypt哈希值
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: 'testadmin',
                    email: 'admin@example.com',
                    password: '$2b$10$jw9OjMrQtGi4LzPL48jSLO0pssW1W.s1e9X4RoyKCGwMBVvIPlH0e', // 'admin123'
                    role: 'admin',
                })
                .returning('id')
                .execute();

            return {
                status: 'ok',
                message: '测试用户创建成功',
                userId: result.identifiers[0].id,
            };
        } catch (error) {
            return {
                status: 'error',
                message: '创建测试用户失败',
                error: error.message,
            };
        }
    }
} 