import { Injectable } from '@nestjs/common';
import { DeviceType } from '../../devices/enums/device-type.enum';
import { DeviceStatus } from '../../devices/enums/device-status.enum';
import { EnergyType } from '../../devices/enums/energy-type.enum';
import { ConnectionType } from '../../devices/enums/connection-type.enum';

@Injectable()
export class MockDeviceGeneratorService {
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
} 