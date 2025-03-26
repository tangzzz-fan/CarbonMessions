import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { DeviceData } from './entities/device-data.entity';
import { CreateDeviceDataDto } from './dto/create-device-data.dto';
import { QueryDeviceDataDto } from './dto/query-device-data.dto';
import { DevicesService } from '../devices/devices.service';
import { QueueService } from './queue/queue.service';

@Injectable()
export class DataCollectionService {
    private readonly logger = new Logger(DataCollectionService.name);

    constructor(
        @InjectRepository(DeviceData)
        private deviceDataRepository: Repository<DeviceData>,
        private devicesService: DevicesService,
        private queueService: QueueService,
    ) { }

    /**
     * 创建设备数据记录
     * @param createDeviceDataDto 设备数据DTO
     * @returns 创建的设备数据
     */
    async create(createDeviceDataDto: CreateDeviceDataDto): Promise<DeviceData> {
        // 验证设备是否存在
        const device = await this.devicesService.findOne(createDeviceDataDto.deviceId, null);
        if (!device) {
            throw new NotFoundException(`Device with ID ${createDeviceDataDto.deviceId} not found`);
        }

        // 创建设备数据实体
        const deviceData = this.deviceDataRepository.create({
            deviceId: createDeviceDataDto.deviceId,
            value: createDeviceDataDto.value,
            type: createDeviceDataDto.type,
            timestamp: new Date(),
        });

        // 保存到数据库
        const savedData = await this.deviceDataRepository.save(deviceData);

        // 发送数据到队列，用于预测模块处理
        this.queueService.sendToProcessingQueue(savedData);

        return savedData;
    }

    /**
     * 批量创建设备数据记录
     * @param createDeviceDataDtos 设备数据DTO数组
     * @returns 创建的设备数据数组
     */
    async createBatch(createDeviceDataDtos: CreateDeviceDataDto[]): Promise<DeviceData[]> {
        const savedDataList: DeviceData[] = [];

        for (const dto of createDeviceDataDtos) {
            try {
                const savedData = await this.create(dto);
                savedDataList.push(savedData);
            } catch (error) {
                this.logger.error(`Failed to save data for device ${dto.deviceId}: ${error.message}`);
                // 继续处理下一条数据
            }
        }

        return savedDataList;
    }

    /**
     * 查询设备数据
     * @param queryParams 查询参数
     * @returns 设备数据列表
     */
    async findAll(queryParams: QueryDeviceDataDto): Promise<DeviceData[]> {
        const { deviceId, startDate, endDate, type } = queryParams;

        // 构建查询条件
        const whereConditions: any = {};

        if (deviceId) {
            whereConditions.deviceId = deviceId;
        }

        if (type) {
            whereConditions.type = type;
        }

        if (startDate && endDate) {
            whereConditions.timestamp = Between(startDate, endDate);
        } else if (startDate) {
            whereConditions.timestamp = Between(startDate, new Date());
        } else if (endDate) {
            whereConditions.timestamp = Between(new Date(0), endDate);
        }

        return this.deviceDataRepository.find({
            where: whereConditions,
            order: { timestamp: 'DESC' },
        });
    }

    /**
     * 根据ID查找设备数据
     * @param id 设备数据ID
     * @returns 设备数据
     */
    async findOne(id: string): Promise<DeviceData> {
        const deviceData = await this.deviceDataRepository.findOne({
            where: { id },
        });

        if (!deviceData) {
            throw new NotFoundException(`Device data with ID ${id} not found`);
        }

        return deviceData;
    }

    /**
     * 根据设备ID获取最新的设备数据
     * @param deviceId 设备ID
     * @param type 数据类型（可选）
     * @returns 最新的设备数据
     */
    async findLatestByDeviceId(deviceId: string, type?: string): Promise<DeviceData> {
        const whereConditions: any = { deviceId };

        if (type) {
            whereConditions.type = type;
        }

        const deviceData = await this.deviceDataRepository.findOne({
            where: whereConditions,
            order: { timestamp: 'DESC' },
        });

        if (!deviceData) {
            throw new NotFoundException(`No data found for device ${deviceId}${type ? ` with type ${type}` : ''}`);
        }

        return deviceData;
    }

    /**
     * 清除旧数据（用于数据维护）
     * @param beforeDate 日期边界
     * @returns 删除的记录数
     */
    async cleanupOldData(beforeDate: Date): Promise<number> {
        const result = await this.deviceDataRepository.delete({
            timestamp: Between(new Date(0), beforeDate),
        });

        return result.affected || 0;
    }

    /**
     * 获取设备的历史数据
     * @param deviceId 设备ID
     * @param type 数据类型
     * @param hours 查询的小时数
     * @param page 页码
     * @param limit 每页数量
     * @returns 历史数据列表
     */
    async getHistoricalData(
        deviceId?: string,
        type?: string,
        hours?: number,
        page: number = 1,
        limit: number = 100
    ): Promise<{ data: DeviceData[], total: number }> {
        try {
            this.logger.debug(`Fetching historical data for device ${deviceId}, type: ${type}, hours: ${hours}`);

            // 构建查询条件
            const where: any = {};
            if (deviceId) {
                where.deviceId = deviceId;
            }
            if (type) {
                where.type = type;
            }

            // 如果指定了时间范围
            if (hours && hours > 0) {
                const startTime = new Date();
                startTime.setHours(startTime.getHours() - hours);
                where.timestamp = MoreThan(startTime);
            }

            // 计算跳过的记录数
            const skip = (page - 1) * limit;

            // 执行查询
            const [data, total] = await this.deviceDataRepository.findAndCount({
                where,
                order: { timestamp: 'DESC' },
                skip,
                take: limit,
            });

            this.logger.log(`Found ${total} historical data records for the specified criteria`);
            return { data, total };
        } catch (error) {
            this.logger.error(`Failed to fetch historical data: ${error.message}`);
            throw error;
        }
    }
} 