import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import * as bcrypt from 'bcrypt';

@ApiTags('数据库初始化')
@Controller('db-init')
export class DbInitController {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    @Get('status')
    @ApiOperation({ summary: '获取数据库初始化状态' })
    @ApiResponse({ status: 200, description: '返回数据库各表记录数' })
    async getStatus() {
        try {
            const userCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)', 'count')
                .from(User, 'u')
                .getRawOne();

            const deviceCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)', 'count')
                .from(Device, 'd')
                .getRawOne();

            return {
                status: 'success',
                counts: {
                    users: parseInt(userCount.count, 10),
                    devices: parseInt(deviceCount.count, 10),
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: '获取状态失败',
                error: error.message,
            };
        }
    }

    @Post('users')
    @ApiOperation({ summary: '初始化用户数据' })
    @ApiResponse({ status: 201, description: '用户数据初始化成功' })
    async initUsers() {
        try {
            // 删除所有现有用户（谨慎使用，仅用于开发环境）
            await this.dataSource.createQueryBuilder().delete().from(User).execute();

            // 定义不同角色的用户
            const users = [
                {
                    username: 'admin',
                    email: 'admin@example.com',
                    password: await bcrypt.hash('admin123', 10),
                    role: 'admin',
                },
                {
                    username: 'manager',
                    email: 'manager@example.com',
                    password: await bcrypt.hash('manager123', 10),
                    role: 'manager',
                },
                {
                    username: 'operator',
                    email: 'operator@example.com',
                    password: await bcrypt.hash('operator123', 10),
                    role: 'operator',
                },
                {
                    username: 'viewer',
                    email: 'viewer@example.com',
                    password: await bcrypt.hash('viewer123', 10),
                    role: 'viewer',
                },
                {
                    username: 'user',
                    email: 'user@example.com',
                    password: await bcrypt.hash('user123', 10),
                    role: 'user',
                },
            ];

            // 插入用户
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(users)
                .execute();

            return {
                status: 'success',
                message: `成功创建 ${result.identifiers.length} 个用户`,
                users: users.map(u => ({ username: u.username, email: u.email, role: u.role })),
            };
        } catch (error) {
            return {
                status: 'error',
                message: '初始化用户数据失败',
                error: error.message,
            };
        }
    }

    @Post('devices')
    @ApiOperation({ summary: '初始化设备数据' })
    @ApiResponse({ status: 201, description: '设备数据初始化成功' })
    async initDevices() {
        try {
            // 删除所有现有设备（谨慎使用，仅用于开发环境）
            await this.dataSource.createQueryBuilder().delete().from(Device).execute();

            // 定义不同类型的设备
            const devices = [
                {
                    name: '物流卡车-01',
                    type: 'truck',
                    location: '装卸区A',
                    status: 'online',
                },
                {
                    name: '物流卡车-02',
                    type: 'truck',
                    location: '运输路线B',
                    status: 'offline',
                },
                {
                    name: '叉车-01',
                    type: 'forklift',
                    location: '仓库A',
                    status: 'online',
                },
                {
                    name: '叉车-02',
                    type: 'forklift',
                    location: '仓库B',
                    status: 'maintenance',
                },
                {
                    name: '冷藏设备-01',
                    type: 'refrigeration',
                    location: '冷库A',
                    status: 'online',
                },
                {
                    name: '包装机-01',
                    type: 'packaging',
                    location: '包装区A',
                    status: 'online',
                },
                {
                    name: '传送带-01',
                    type: 'conveyor',
                    location: '分拣区A',
                    status: 'offline',
                },
                {
                    name: '空调系统-01',
                    type: 'hvac',
                    location: '办公区A',
                    status: 'online',
                },
                {
                    name: '照明系统-01',
                    type: 'lighting',
                    location: '仓库A',
                    status: 'online',
                },
                {
                    name: '发电机-01',
                    type: 'generator',
                    location: '后备电源室',
                    status: 'standby',
                },
            ];

            // 插入设备
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(Device)
                .values(devices)
                .execute();

            return {
                status: 'success',
                message: `成功创建 ${result.identifiers.length} 个设备`,
                devices,
            };
        } catch (error) {
            return {
                status: 'error',
                message: '初始化设备数据失败',
                error: error.message,
            };
        }
    }

    @Post('all')
    @ApiOperation({ summary: '初始化所有数据' })
    @ApiResponse({ status: 201, description: '所有数据初始化成功' })
    async initAll() {
        const usersResult = await this.initUsers();
        const devicesResult = await this.initDevices();

        return {
            status: 'success',
            users: usersResult,
            devices: devicesResult,
        };
    }
} 