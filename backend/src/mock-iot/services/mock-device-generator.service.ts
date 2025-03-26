import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../../devices/devices.service';
import { DeviceType } from '../../devices/enums/device-type.enum';
import { DeviceStatus } from '../../devices/enums/device-status.enum';
import { EnergyType } from '../../devices/enums/energy-type.enum';
import { ConnectionType } from '../../devices/enums/connection-type.enum';

@Injectable()
export class MockDeviceGeneratorService {
    private readonly logger = new Logger(MockDeviceGeneratorService.name);

    constructor(private devicesService: DevicesService) { }

    /**
     * 生成标准设备ID
     * @param type 设备类型
     * @param series 设备系列/组 (A, B, C...)
     * @param number 设备号码 (001, 002...)
     */
    generateDeviceId(type: DeviceType, series: string, number: string): string {
        let prefix = 'DEV';

        switch (type) {
            case DeviceType.TRUCK:
                prefix += '-TRK';
                break;
            case DeviceType.FORKLIFT:
                prefix += '-FLT';
                break;
            case DeviceType.PACKAGING:
                prefix += '-PKG';
                break;
            case DeviceType.REFRIGERATION:
                prefix += '-RF';
                break;
            case DeviceType.LIGHTING:
                prefix += '-LT';
                break;
            case DeviceType.OTHER:
                prefix += '-OTH';
                break;
        }

        return `${prefix}-${series}${number.padStart(3, '0')}`;
    }

    /**
     * 从设备ID推断设备类型
     */
    inferDeviceTypeFromId(deviceId: string): DeviceType {
        if (deviceId.includes('TRK')) return DeviceType.TRUCK;
        if (deviceId.includes('FLT')) return DeviceType.FORKLIFT;
        if (deviceId.includes('PKG')) return DeviceType.PACKAGING;
        if (deviceId.includes('RF')) return DeviceType.REFRIGERATION;
        if (deviceId.includes('LT')) return DeviceType.LIGHTING;
        if (deviceId.includes('CNV') || deviceId.includes('OTH')) return DeviceType.OTHER;
        if (deviceId.includes('HVAC')) return DeviceType.OTHER;
        return DeviceType.OTHER;
    }

    /**
     * 从设备ID推断能源类型
     */
    inferEnergyTypeFromId(deviceId: string): EnergyType {
        if (deviceId.includes('TRK')) return EnergyType.DIESEL;
        if (deviceId.includes('FLT') && !deviceId.includes('FLT-E')) return EnergyType.DIESEL;
        if (deviceId.includes('FLT-E')) return EnergyType.ELECTRICITY;
        return EnergyType.ELECTRICITY;
    }

    /**
     * 创建基本设备对象
     */
    createBaseDevice(deviceId: string, name: string, description: string) {
        const type = this.inferDeviceTypeFromId(deviceId);

        return {
            deviceId,
            name,
            description,
            type,
            status: DeviceStatus.ACTIVE,
            energyType: this.inferEnergyTypeFromId(deviceId),
            connectionType: ConnectionType.WIFI,
            emissionFactor: type === DeviceType.TRUCK ? 2.3 : 1.2
        };
    }

    /**
     * 生成基础模拟设备数据
     * @param count 要生成的设备数量
     */
    async generateBasicDevices(count: number = 10) {
        const deviceTypes = Object.values(DeviceType);
        const results = [];

        for (let i = 0; i < count; i++) {
            const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];

            if (!Object.values(DeviceType).includes(deviceType)) {
                this.logger.warn(`跳过无效的设备类型: ${deviceType}`);
                continue;
            }

            const deviceData = {
                name: `模拟设备-${deviceType}-${Math.floor(Math.random() * 1000)}`,
                description: `自动生成的模拟${deviceType}设备`,
                deviceId: `MOCK-${deviceType}-${Date.now()}-${i}`,
                type: deviceType,
                status: DeviceStatus.ACTIVE,
                location: '模拟位置',
                manufacturer: '模拟厂商',
                model: `模拟型号-${i}`,
                serialNumber: `SN${Math.floor(Math.random() * 1000000)}`,
                energyType: EnergyType.ELECTRICITY,
                powerRating: 100 + Math.random() * 900,
                connectionType: ConnectionType.WIFI,
                isActive: true,
            };

            try {
                const device = await this.devicesService.create(deviceData);
                results.push(device);
                this.logger.log(`成功创建模拟设备: ${device.name} (${device.deviceId})`);
            } catch (error) {
                this.logger.error(`创建模拟设备失败: ${error.message}`);
            }
        }

        return {
            success: true,
            message: `成功创建${results.length}个模拟设备`,
            devices: results
        };
    }

    /**
     * 生成物流园区专用设备
     */
    async generateLogisticsParkDevices() {
        // 设备配置，包含数量和特殊属性
        const deviceConfigs = [
            { type: DeviceType.GATE, count: 4, powerRating: 500, location: '园区出入口' },
            { type: DeviceType.WEIGHT_SCALE, count: 2, powerRating: 200, location: '卡口称重区' },
            { type: DeviceType.CAMERA, count: 10, powerRating: 30, location: '园区周界' },
            { type: DeviceType.LOADER, count: 3, powerRating: 5000, location: '装卸区' },
            { type: DeviceType.CONVEYOR, count: 5, powerRating: 2000, location: '传送区' },
            { type: DeviceType.FORKLIFT, count: 8, powerRating: 1500, location: '仓储区' },
            { type: DeviceType.CHARGING_STATION, count: 6, powerRating: 7000, location: '充电区' },
            { type: DeviceType.HVAC, count: 12, powerRating: 3000, location: '办公区' },
            { type: DeviceType.LIGHTING, count: 20, powerRating: 100, location: '全园区' },
            { type: DeviceType.SECURITY, count: 5, powerRating: 50, location: '安保中心' },
        ];

        const results = [];

        for (const config of deviceConfigs) {
            if (!Object.values(DeviceType).includes(config.type)) {
                this.logger.warn(`跳过无效的设备类型配置: ${config.type}`);
                continue;
            }

            for (let i = 0; i < config.count; i++) {
                const deviceData = {
                    name: `${config.type}-${i + 1}`,
                    description: `物流园区${config.type}设备`,
                    deviceId: `LP-${config.type}-${i + 1}`,
                    type: config.type,
                    status: DeviceStatus.ACTIVE,
                    location: config.location,
                    manufacturer: '园区自有设备',
                    model: `物流型-${config.type}`,
                    serialNumber: `LP${config.type}${Math.floor(Math.random() * 1000000)}`,
                    energyType: EnergyType.ELECTRICITY,
                    powerRating: config.powerRating + (Math.random() * 0.2 - 0.1) * config.powerRating, // 功率上下浮动10%
                    connectionType: ConnectionType.WIFI,
                    isActive: true,
                };

                try {
                    const device = await this.devicesService.create(deviceData);
                    results.push(device);
                    this.logger.log(`成功创建物流园区设备: ${device.name} (${device.deviceId})`);
                } catch (error) {
                    this.logger.error(`创建物流园区设备失败: ${error.message}`);
                }
            }
        }

        return {
            success: true,
            message: `成功创建${results.length}个物流园区设备`,
            devices: results
        };
    }

    /**
     * 生成碳排放监测专用设备
     */
    async generateCarbonMonitoringDevices() {
        // 碳排放监测设备配置
        const carbonDeviceConfigs = [
            { type: DeviceType.CARBON_SENSOR, count: 15, powerRating: 20, location: '全园区', emissionFactor: 0.1 },
            { type: DeviceType.ENERGY_METER, count: 25, powerRating: 15, location: '能源分配区', emissionFactor: 0.05 },
            { type: DeviceType.GAS_METER, count: 8, powerRating: 10, location: '燃气设施区', emissionFactor: 0.03 },
            { type: DeviceType.AIR_QUALITY_MONITOR, count: 12, powerRating: 25, location: '仓储及车辆区', emissionFactor: 0.08 },
            { type: DeviceType.EMISSIONS_ANALYZER, count: 6, powerRating: 40, location: '车辆维修区', emissionFactor: 0.15 },
            { type: DeviceType.SOLAR_PANEL, count: 30, powerRating: 0, location: '屋顶', emissionFactor: -2.5 }, // 负排放因子，表示减排
            { type: DeviceType.SMART_GRID, count: 3, powerRating: 50, location: '变电站', emissionFactor: 0.2 },
        ];

        const results = [];

        for (const config of carbonDeviceConfigs) {
            if (!Object.values(DeviceType).includes(config.type)) {
                this.logger.warn(`跳过无效的碳排放监测设备类型: ${config.type}`);
                continue;
            }

            for (let i = 0; i < config.count; i++) {
                const deviceData = {
                    name: `${config.type}-${i + 1}`,
                    description: `碳排放监测${config.type}设备`,
                    deviceId: `CARBON-${config.type}-${i + 1}`,
                    type: config.type,
                    status: DeviceStatus.ACTIVE,
                    location: config.location,
                    manufacturer: '碳中和科技公司',
                    model: `碳监测-${config.type}`,
                    serialNumber: `C${config.type}${Math.floor(Math.random() * 1000000)}`,
                    energyType: EnergyType.ELECTRICITY,
                    powerRating: config.powerRating,
                    connectionType: ConnectionType.WIFI,
                    isActive: true,
                    emissionFactor: config.emissionFactor, // 排放因子，用于计算碳排放量
                    accuracy: 0.95 + Math.random() * 0.04, // 监测精度，95%-99%
                    lastCalibration: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 最近校准时间
                };

                try {
                    const device = await this.devicesService.create(deviceData);
                    results.push(device);
                    this.logger.log(`成功创建碳排放监测设备: ${device.name} (${device.deviceId})`);
                } catch (error) {
                    this.logger.error(`创建碳排放监测设备失败: ${error.message}`);
                }
            }
        }

        return {
            success: true,
            message: `成功创建${results.length}个碳排放监测设备`,
            devices: results
        };
    }

    /**
     * 验证设备类型是否有效
     * @param type 设备类型
     */
    private isValidDeviceType(type: any): boolean {
        return Object.values(DeviceType).includes(type);
    }
} 