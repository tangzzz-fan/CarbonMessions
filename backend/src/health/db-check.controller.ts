import { Controller, Get, Query, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import { Role } from '../users/enums/role.enum';
import { DeviceStatus } from '../devices/enums/device-status.enum';
import { DeviceType } from '../devices/enums/device-type.enum';
import { EnergyType } from '../devices/enums/energy-type.enum';

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

    @Post('test-user')
    @ApiOperation({ summary: '创建测试用户' })
    @ApiResponse({ status: 200, description: '返回创建结果' })
    async createTestUser() {
        try {
            // 检查是否存在管理员用户
            const userCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)')
                .from(User, 'user')
                .where('user.username = :username', { username: 'admin' })
                .getRawOne();

            if (parseInt(userCount.count) > 0) {
                return {
                    message: '测试用户已存在',
                    timestamp: new Date(),
                };
            }

            // 插入管理员用户
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: 'admin',
                    email: 'admin@example.com',
                    password: '$2b$10$jw9OjMrQtGi4LzPL48jSLO0pssW1W.s1e9X4RoyKCGwMBVvIPlH0e', // 'admin123'
                    role: Role.ADMIN, // 使用枚举值替代字符串
                })
                .returning('id')
                .execute();

            return {
                message: '测试用户创建成功',
                userId: result.identifiers[0].id,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                message: '测试用户创建失败',
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    @Get('devices')
    @ApiOperation({ summary: '检查设备表记录' })
    @ApiResponse({ status: 200, description: '返回设备记录' })
    @ApiQuery({ name: 'type', required: false, description: '按设备类型过滤' })
    @ApiQuery({ name: 'status', required: false, description: '按设备状态过滤' })
    @ApiQuery({ name: 'energyType', required: false, description: '按能源类型过滤' })
    async checkDevices(
        @Query('type') type?: DeviceType,
        @Query('status') status?: DeviceStatus,
        @Query('energyType') energyType?: EnergyType
    ) {
        try {
            // 构建查询条件
            let query = this.dataSource
                .createQueryBuilder()
                .select([
                    'd.id',
                    'd.name',
                    'd.description',
                    'd.type',
                    'd.status',
                    'd.location',
                    'd.energyType AS "energyType"',
                    'd.emissionFactor AS "emissionFactor"',
                    'd.operatorId AS "operatorId"',
                    'd.createdAt AS "createdAt"',
                    'd.updatedAt AS "updatedAt"',
                ])
                .from(Device, 'd');

            // 添加过滤条件
            if (type) {
                query = query.where('d.type = :type', { type });
            }

            if (status) {
                if (type) {
                    query = query.andWhere('d.status = :status', { status });
                } else {
                    query = query.where('d.status = :status', { status });
                }
            }

            if (energyType) {
                if (type || status) {
                    query = query.andWhere('d.energyType = :energyType', { energyType });
                } else {
                    query = query.where('d.energyType = :energyType', { energyType });
                }
            }

            // 执行查询
            const devices = await query.getRawMany();

            return {
                count: devices.length,
                devices: devices
            };
        } catch (error) {
            return {
                status: 'error',
                message: '查询失败',
                error: error.message,
            };
        }
    }

    @Get('devices-count')
    @ApiOperation({ summary: '检查设备总数' })
    @ApiResponse({ status: 200, description: '返回设备数量' })
    async countDevices() {
        try {
            const count = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)', 'count')
                .from(Device, 'd')
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
} 