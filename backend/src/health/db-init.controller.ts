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

            // 定义测试设备数据，使用枚举类型确保类型匹配
            const devices = [
                // 卡车类设备
                {
                    name: '卡车 A001',
                    description: '物流运输卡车',
                    type: DeviceType.TRUCK,
                    status: DeviceStatus.ACTIVE,
                    location: '园区入口',
                    manufacturer: '重型卡车制造商',
                    model: 'HT-100',
                    serialNumber: 'TRK-A001',
                    deviceId: 'DEV-TRK-A001',
                    energyType: EnergyType.DIESEL,
                    emissionFactor: 2.3,
                    operatorId: operatorIds[0] || null,
                    powerRating: 320.5,
                    operatingVoltage: 24.0,
                    operatingCurrent: 120.0,
                    fuelType: '柴油',
                    capacity: 80.0,
                    unit: 'L',
                    connectionType: ConnectionType.CELLULAR
                },
                {
                    name: '卡车 A002',
                    description: '城际配送卡车',
                    type: DeviceType.TRUCK,
                    status: DeviceStatus.ACTIVE,
                    location: '配送中心',
                    manufacturer: '中型卡车制造商',
                    model: 'MT-200',
                    serialNumber: 'TRK-A002',
                    deviceId: 'DEV-TRK-A002',
                    energyType: EnergyType.DIESEL,
                    emissionFactor: 1.8,
                    operatorId: operatorIds[0] || null,
                    powerRating: 280.0,
                    operatingVoltage: 24.0,
                    operatingCurrent: 100.0,
                    fuelType: '柴油',
                    capacity: 60.0,
                    unit: 'L',
                    connectionType: ConnectionType.CELLULAR
                },
                {
                    name: '卡车 A003',
                    description: '长途运输卡车',
                    type: DeviceType.TRUCK,
                    status: DeviceStatus.MAINTENANCE,
                    location: '维修车间',
                    manufacturer: '重型卡车制造商',
                    model: 'HT-150',
                    serialNumber: 'TRK-A003',
                    deviceId: 'DEV-TRK-A003',
                    energyType: EnergyType.CNG,
                    emissionFactor: 1.5,
                    operatorId: operatorIds[1] || null,
                    powerRating: 350.0,
                    operatingVoltage: 24.0,
                    operatingCurrent: 130.0,
                    fuelType: '压缩天然气',
                    capacity: 100.0,
                    unit: 'L',
                    connectionType: ConnectionType.CELLULAR
                },

                // 叉车类设备
                {
                    name: '叉车 F001',
                    description: '货物装卸叉车',
                    type: DeviceType.FORKLIFT,
                    status: DeviceStatus.ACTIVE,
                    location: '仓库A区',
                    manufacturer: '叉车制造商',
                    model: 'FL-50',
                    serialNumber: 'FL-F001',
                    deviceId: 'DEV-FL-F001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 1.2,
                    operatorId: operatorIds[1] || null,
                    powerRating: 15.0,
                    operatingVoltage: 48.0,
                    operatingCurrent: 80.0,
                    fuelType: null,
                    capacity: 50.0,
                    unit: 'kWh',
                    connectionType: ConnectionType.WIFI
                },
                {
                    name: '叉车 F002',
                    description: '重型叉车',
                    type: DeviceType.FORKLIFT,
                    status: DeviceStatus.ACTIVE,
                    location: '仓库B区',
                    manufacturer: '叉车制造商',
                    model: 'FL-100',
                    serialNumber: 'FL-F002',
                    deviceId: 'DEV-FL-F002',
                    energyType: EnergyType.DIESEL,
                    emissionFactor: 1.7,
                    operatorId: operatorIds[0] || null,
                    powerRating: 75.0,
                    operatingVoltage: 12.0,
                    operatingCurrent: 120.0,
                    fuelType: '柴油',
                    capacity: 30.0,
                    unit: 'L',
                    connectionType: ConnectionType.CELLULAR
                },
                {
                    name: '叉车 F003',
                    description: '电动微型叉车',
                    type: DeviceType.FORKLIFT,
                    status: DeviceStatus.STANDBY,
                    location: '仓库C区',
                    manufacturer: '小型设备制造商',
                    model: 'MFL-20',
                    serialNumber: 'FL-F003',
                    deviceId: 'DEV-FL-F003',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 0.8,
                    operatorId: operatorIds[2] || null,
                    powerRating: 8.0,
                    operatingVoltage: 24.0,
                    operatingCurrent: 40.0,
                    fuelType: null,
                    capacity: 20.0,
                    unit: 'kWh',
                    connectionType: ConnectionType.WIFI
                },

                // 包装设备
                {
                    name: '包装机 P001',
                    description: '自动化包装设备',
                    type: DeviceType.PACKAGING,
                    status: DeviceStatus.STANDBY,
                    location: '包装车间',
                    manufacturer: '包装设备制造商',
                    model: 'PKG-200',
                    serialNumber: 'PKG-P001',
                    deviceId: 'DEV-PKG-P001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 1.0,
                    operatorId: managerIds[0] || null,
                    powerRating: 12.5,
                    operatingVoltage: 220.0,
                    operatingCurrent: 25.0,
                    fuelType: null,
                    capacity: null,
                    unit: null,
                    connectionType: ConnectionType.WIFI
                },
                {
                    name: '包装机 P002',
                    description: '高速自动包装线',
                    type: DeviceType.PACKAGING,
                    status: DeviceStatus.ACTIVE,
                    location: '包装车间',
                    manufacturer: '包装设备制造商',
                    model: 'PKG-350',
                    serialNumber: 'PKG-P002',
                    deviceId: 'DEV-PKG-P002',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 1.2,
                    operatorId: managerIds[0] || null,
                    powerRating: 18.0,
                    operatingVoltage: 380.0,
                    operatingCurrent: 32.0,
                    fuelType: null,
                    capacity: null,
                    unit: null,
                    connectionType: ConnectionType.WIFI
                },

                // 制冷设备
                {
                    name: '冷库 R001',
                    description: '大型冷藏库',
                    type: DeviceType.REFRIGERATION,
                    status: DeviceStatus.ACTIVE,
                    location: '冷藏区',
                    manufacturer: '制冷设备制造商',
                    model: 'CLR-500',
                    serialNumber: 'RF-R001',
                    deviceId: 'DEV-RF-R001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 2.5,
                    operatorId: managerIds[1] || null,
                    powerRating: 45.0,
                    operatingVoltage: 380.0,
                    operatingCurrent: 60.0,
                    fuelType: null,
                    capacity: 500.0,
                    unit: 'm³',
                    connectionType: ConnectionType.WIFI
                },

                // 照明设备
                {
                    name: '照明系统 L001',
                    description: '仓库LED照明',
                    type: DeviceType.LIGHTING,
                    status: DeviceStatus.ACTIVE,
                    location: '仓库A区',
                    manufacturer: '照明设备制造商',
                    model: 'LED-PRO',
                    serialNumber: 'LT-L001',
                    deviceId: 'DEV-LT-L001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 0.5,
                    operatorId: null,
                    powerRating: 3.5,
                    operatingVoltage: 220.0,
                    operatingCurrent: 10.0,
                    fuelType: null,
                    capacity: null,
                    unit: null,
                    connectionType: ConnectionType.WIFI
                },

                // 其他类型设备
                {
                    name: '空调系统 A001',
                    description: '办公区中央空调',
                    type: DeviceType.OTHER,
                    status: DeviceStatus.ACTIVE,
                    location: '办公大楼',
                    manufacturer: '空调制造商',
                    model: 'AC-2000',
                    serialNumber: 'AC-A001',
                    deviceId: 'DEV-AC-A001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 1.8,
                    operatorId: null,
                    powerRating: 25.0,
                    operatingVoltage: 380.0,
                    operatingCurrent: 40.0,
                    fuelType: null,
                    capacity: 2000.0,
                    unit: 'm²',
                    connectionType: ConnectionType.WIFI
                },
                {
                    name: '传送带 C001',
                    description: '自动分拣传送带',
                    type: DeviceType.OTHER,
                    status: DeviceStatus.INACTIVE,
                    location: '分拣中心',
                    manufacturer: '物流设备制造商',
                    model: 'CNV-100',
                    serialNumber: 'CNV-C001',
                    deviceId: 'DEV-CNV-C001',
                    energyType: EnergyType.ELECTRICITY,
                    emissionFactor: 1.1,
                    operatorId: operatorIds[2] || null,
                    powerRating: 7.5,
                    operatingVoltage: 380.0,
                    operatingCurrent: 16.0,
                    fuelType: null,
                    capacity: 500.0,
                    unit: 'kg/h',
                    connectionType: ConnectionType.WIFI
                }
            ];

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