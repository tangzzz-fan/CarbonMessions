import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Device } from '../devices/entities/device.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/enums/role.enum';
import { DeviceStatus } from '../devices/enums/device-status.enum';
import { DeviceType } from '../devices/enums/device-type.enum';
import { EnergyType } from '../devices/enums/energy-type.enum';
import { ConnectionType } from '../devices/enums/connection-type.enum';
import { MockDeviceGeneratorService } from '../mock-iot/services/mock-device-generator.service';

@ApiTags('数据库初始化')
@Controller('db-init')
export class DbInitController {
    constructor(
        @InjectDataSource() private dataSource: DataSource,
        private mockDeviceGenerator: MockDeviceGeneratorService,
    ) { }

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
            // 检查是否已存在用户
            const userCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)')
                .from(User, 'user')
                .getRawOne();

            if (parseInt(userCount.count) > 0) {
                return {
                    message: '用户数据已存在，跳过初始化',
                    count: parseInt(userCount.count),
                    timestamp: new Date(),
                };
            }

            // 定义测试用户，使用枚举值代替字符串
            const users = [
                {
                    username: 'admin',
                    email: 'admin@example.com',
                    password: '$2b$10$jw9OjMrQtGi4LzPL48jSLO0pssW1W.s1e9X4RoyKCGwMBVvIPlH0e', // 'admin123'
                    role: Role.ADMIN // 使用枚举类型
                },
                {
                    username: 'manager',
                    email: 'manager@example.com',
                    password: '$2b$10$O0JU4d7nQKGc.cMrlYh5GeJ.P1ZPnD58pHYmiD1CuPrEoU3RjO43.', // 'manager123'
                    role: Role.MANAGER // 使用枚举类型
                },
                {
                    username: 'operator',
                    email: 'operator@example.com',
                    password: '$2b$10$YOQpIGTGWBxKzJbQI16BO.7/d0ORMJgbxqfZtBP5kYmDczjWePcj2', // 'operator123'
                    role: Role.OPERATOR // 使用枚举类型
                },
                {
                    username: 'viewer',
                    email: 'viewer@example.com',
                    password: '$2b$10$G7vvG0LGQJfCVJGLhg4z2u59Id3qI1tMn2qAkfL36SFMsuFCZXd42', // 'viewer123'
                    role: Role.VIEWER // 使用枚举类型
                },
                {
                    username: 'user',
                    email: 'user@example.com',
                    password: '$2b$10$P/Tte0sMajE1WL1GX8e69eclXCRgRayhK8mRBvFgRgYyf/G9mcwLO', // 'user123'
                    role: Role.USER // 使用枚举类型
                },
            ];

            // 插入用户数据
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(User)
                .values(users)
                .execute();

            return {
                message: '用户数据初始化成功',
                count: result.identifiers.length,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                message: '用户数据初始化失败',
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    @Post('devices')
    @ApiOperation({ summary: '初始化设备数据' })
    @ApiResponse({ status: 201, description: '设备数据初始化成功' })
    async initDevices() {
        try {
            // 检查是否已存在设备
            const deviceCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)')
                .from(Device, 'device')
                .getRawOne();

            if (parseInt(deviceCount.count) > 0) {
                return {
                    message: '设备数据已存在，跳过初始化',
                    count: parseInt(deviceCount.count),
                    timestamp: new Date(),
                };
            }

            // 首先获取操作员列表
            const operators = await this.dataSource
                .createQueryBuilder()
                .select(['id'])
                .from(User, 'user')
                .where('user.role = :role', { role: Role.OPERATOR })
                .limit(3)
                .getRawMany();

            // 获取管理员列表
            const managers = await this.dataSource
                .createQueryBuilder()
                .select(['id'])
                .from(User, 'user')
                .where('user.role = :role', { role: Role.MANAGER })
                .limit(3)
                .getRawMany();

            // 如果没有足够的操作员和管理员，创建一些临时用户ID
            const operatorIds = operators.length > 0
                ? operators.map(op => op.id)
                : ['default-operator-1', 'default-operator-2'];

            const managerIds = managers.length > 0
                ? managers.map(m => m.id)
                : ['default-manager-1', 'default-manager-2'];

            // 使用设备生成器创建设备
            const devices = [
                // 卡车类设备
                this.mockDeviceGenerator.createBaseDevice(
                    'DEV-TRK-A001',
                    '卡车 A001',
                    '物流运输卡车'
                ),
                this.mockDeviceGenerator.createBaseDevice(
                    'DEV-TRK-A002',
                    '卡车 A002',
                    '城际配送卡车'
                ),
                // 叉车类设备
                this.mockDeviceGenerator.createBaseDevice(
                    'DEV-FLT-F001',
                    '叉车 F001',
                    '货物装卸叉车'
                ),
                // 其他设备类型...
            ];

            // 增加设备的额外属性
            devices.forEach((device, index) => {
                device['operatorId'] = operatorIds[index % operatorIds.length] || null;
                // 添加其他必要属性...
            });

            // 插入设备数据
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(Device)
                .values(devices)
                .execute();

            return {
                message: '设备数据初始化成功',
                count: result.identifiers.length,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                message: '设备数据初始化失败',
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    @Post('carbon-devices')
    @ApiOperation({ summary: '初始化碳排放监测设备数据' })
    @ApiResponse({ status: 201, description: '碳排放监测设备数据初始化成功' })
    async initCarbonDevices() {
        try {
            // 检查是否已存在碳排放监测设备
            const carbonDeviceCount = await this.dataSource
                .createQueryBuilder()
                .select('COUNT(*)')
                .from(Device, 'device')
                .where('device.type LIKE :type', { type: '%carbon%' })
                .orWhere('device.type LIKE :type2', { type2: '%energy%' })
                .getRawOne();

            if (parseInt(carbonDeviceCount.count) > 0) {
                return {
                    message: '碳排放监测设备数据已存在，跳过初始化',
                    count: parseInt(carbonDeviceCount.count),
                    timestamp: new Date(),
                };
            }

            // 添加基础碳排放监测设备
            const devices = [
                // 碳排放传感器
                this.mockDeviceGenerator.createBaseDevice(
                    'CARBON-SENSOR-001',
                    '碳排放传感器 001',
                    '主要车间碳排放监测传感器'
                ),
                this.mockDeviceGenerator.createBaseDevice(
                    'CARBON-SENSOR-002',
                    '碳排放传感器 002',
                    '储存区碳排放监测传感器'
                ),

                // 能源表
                this.mockDeviceGenerator.createBaseDevice(
                    'ENERGY-METER-001',
                    '智能电表 001',
                    '主变电站智能电表'
                ),

                // 空气质量监测器
                this.mockDeviceGenerator.createBaseDevice(
                    'AIR-QUALITY-001',
                    '空气质量监测器 001',
                    '办公区空气质量监测器'
                ),
            ];

            // 添加额外的碳排放相关属性
            devices.forEach(device => {
                device['emissionFactor'] = Math.random() * 2; // 随机排放因子
                device['accuracy'] = 0.95 + Math.random() * 0.04; // 监测精度95%-99%
                device['calibrationCycle'] = 90; // 校准周期（天）
            });

            // 插入设备数据
            const result = await this.dataSource
                .createQueryBuilder()
                .insert()
                .into(Device)
                .values(devices)
                .execute();

            // 使用生成器生成更多碳排放监测设备
            const generatedResult = await this.mockDeviceGenerator.generateCarbonMonitoringDevices();

            return {
                message: '碳排放监测设备数据初始化成功',
                count: result.identifiers.length + generatedResult.devices.length,
                timestamp: new Date(),
            };
        } catch (error) {
            return {
                message: '碳排放监测设备数据初始化失败',
                error: error.message,
                timestamp: new Date(),
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