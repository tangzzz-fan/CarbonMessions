import { Controller, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Device } from '../devices/entities/device.entity';

@ApiTags('数据库更新')
@Controller('db-update')
export class DbUpdateController {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    @Post('update-device-ids')
    @ApiOperation({ summary: '更新设备ID' })
    async updateDeviceIds() {
        try {
            // 查找所有没有deviceId的设备
            const devices = await this.dataSource
                .createQueryBuilder()
                .select('id, "serialNumber"')
                .from(Device, 'device')
                .where('device."deviceId" IS NULL')
                .getRawMany();

            let updatedCount = 0;

            // 逐个更新设备ID
            for (const device of devices) {
                const deviceId = device.serialNumber ?
                    `DEV-${device.serialNumber}` :
                    `DEV-${device.id.substring(0, 8)}`;

                await this.dataSource
                    .createQueryBuilder()
                    .update(Device)
                    .set({ deviceId })
                    .where('id = :id', { id: device.id })
                    .execute();

                updatedCount++;
            }

            return {
                message: '设备ID更新完成',
                updatedCount,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                message: '设备ID更新失败',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
} 