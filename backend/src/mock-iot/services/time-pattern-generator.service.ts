import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../../devices/devices.service';
import { DataCollectionService } from '../../data-collection/data-collection.service';
import { DeviceType } from '../../devices/enums/device-type.enum';

@Injectable()
export class TimePatternGeneratorService {
    private readonly logger = new Logger(TimePatternGeneratorService.name);

    constructor(
        private devicesService: DevicesService,
        private dataCollectionService: DataCollectionService,
    ) { }

    /**
     * 生成符合工作日高峰期特征的设备数据
     */
    async generateWorkdayPeakPattern() {
        // 获取所有设备
        const allDevices = await this.devicesService.findAll({ roles: ['ADMIN'] });
        const devicesByType = this.groupDevicesByType(allDevices);

        // 工作日高峰特征:
        // 1. 所有设备活跃度高
        // 2. 能耗设备负载较高
        // 3. 装卸设备高频工作
        // 4. 充电桩使用率高

        // 处理能耗设备（空调、照明等）
        for (const device of devicesByType[DeviceType.HVAC] || []) {
            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: 8 + Math.random() * 4, // 高负载运行
                metadata: { timePattern: 'workday_peak' }
            });

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'temperature',
                value: 24 + Math.random() * 2, // 正常温度调节
                metadata: { timePattern: 'workday_peak' }
            });
        }

        // 处理充电桩
        for (const device of devicesByType[DeviceType.CHARGING_STATION] || []) {
            // 高峰期85%的充电桩在使用
            const isActive = Math.random() < 0.85;

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: isActive ? 20 + Math.random() * 15 : 0.5 + Math.random() * 0.5,
                metadata: { timePattern: 'workday_peak', status: isActive ? 'charging' : 'standby' }
            });

            if (isActive) {
                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: 'charging_current',
                    value: 30 + Math.random() * 20,
                    metadata: { timePattern: 'workday_peak' }
                });
            }
        }

        // 处理叉车等移动设备
        for (const device of devicesByType[DeviceType.FORKLIFT] || []) {
            // 高峰期90%的叉车在运行
            const isActive = Math.random() < 0.9;

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: isActive ? 12 + Math.random() * 8 : 0.2 + Math.random() * 0.3,
                metadata: { timePattern: 'workday_peak', status: isActive ? 'operating' : 'standby' }
            });

            if (isActive) {
                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: 'speed',
                    value: 3 + Math.random() * 7,
                    metadata: { timePattern: 'workday_peak' }
                });

                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: 'load',
                    value: 60 + Math.random() * 40,
                    metadata: { timePattern: 'workday_peak' }
                });
            }
        }

        // 返回结果
        return {
            success: true,
            message: '成功生成工作日高峰期设备数据',
            deviceCount: allDevices.length
        };
    }

    /**
     * 生成符合夜间模式特征的设备数据
     */
    async generateNightPattern() {
        // 获取所有设备
        const allDevices = await this.devicesService.findAll({ roles: ['ADMIN'] });
        const devicesByType = this.groupDevicesByType(allDevices);

        // 夜间模式特征:
        // 1. 大多数设备处于待机或关闭状态
        // 2. 照明设备可能处于低功率运行
        // 3. 安防系统保持正常运行
        // 4. 部分充电设备在工作（车辆过夜充电）

        // 处理能耗设备（空调、照明等）
        for (const device of devicesByType[DeviceType.HVAC] || []) {
            // 夜间空调大多处于关闭或低功率状态
            const isActive = Math.random() < 0.2;

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: isActive ? 2 + Math.random() * 2 : 0.1 + Math.random() * 0.2,
                metadata: { timePattern: 'night', status: isActive ? 'low_power' : 'standby' }
            });
        }

        // 处理照明设备
        for (const device of devicesByType[DeviceType.LIGHTING] || []) {
            // 夜间部分照明保持运行（安全照明）
            const isActive = Math.random() < 0.4;

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: isActive ? 1 + Math.random() * 1.5 : 0,
                metadata: { timePattern: 'night', status: isActive ? 'low_power' : 'off' }
            });
        }

        // 处理安防设备
        for (const device of devicesByType[DeviceType.SECURITY] || []) {
            // 安防设备保持运行
            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: 2 + Math.random() * 1,
                metadata: { timePattern: 'night', status: 'active' }
            });
        }

        // 处理充电桩
        for (const device of devicesByType[DeviceType.CHARGING_STATION] || []) {
            // 夜间约30%的充电桩在使用（车辆过夜充电）
            const isActive = Math.random() < 0.3;

            await this.dataCollectionService.create({
                deviceId: device.id,
                type: 'power_consumption',
                value: isActive ? 15 + Math.random() * 10 : 0.2 + Math.random() * 0.3,
                metadata: { timePattern: 'night', status: isActive ? 'charging' : 'standby' }
            });

            if (isActive) {
                // 夜间充电通常是完整充电过程的中后段
                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: 'charging_current',
                    value: 10 + Math.random() * 15, // 相对较低的充电电流（后段充电）
                    metadata: { timePattern: 'night' }
                });
            }
        }

        // 返回结果
        return {
            success: true,
            message: '成功生成夜间模式设备数据',
            deviceCount: allDevices.length
        };
    }

    // 工具方法：按类型对设备进行分组
    private groupDevicesByType(devices) {
        const result = {};
        for (const device of devices) {
            if (!result[device.type]) {
                result[device.type] = [];
            }
            result[device.type].push(device);
        }
        return result;
    }

    // 其他时间模式生成方法...
} 