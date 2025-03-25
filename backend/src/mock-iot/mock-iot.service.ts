import { Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { QueueService } from '../data-collection/queue/queue.service';
import { CreateDeviceDataDto } from '../data-collection/dto/create-device-data.dto';
import { DevicesService } from '../devices/devices.service';
import { DataCollectionService } from '../data-collection/data-collection.service';
import { SimulationConfig } from './interfaces/simulation-config.interface';
import { DeviceStatus } from '../devices/enums/device-status.enum';
import { DeviceType } from '../devices/enums/device-type.enum';
import { EnergyType } from '../devices/enums/energy-type.enum';
import { ConnectionType } from '../devices/enums/connection-type.enum';
import { Role } from '../users/enums/role.enum';
import { MockDeviceGeneratorService } from './services/mock-device-generator.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MockIotService implements OnModuleInit {
    private readonly logger = new Logger(MockIotService.name);
    private readonly csvFilePath: string;
    private mockData: any[] = [];
    private deviceMapping: Map<string, string> = new Map(); // 映射设备标识到设备ID
    private simulationActive = false;
    private simulationIntervalId: NodeJS.Timeout | null = null; // 统一使用一个定时器引用
    private simulationConfig: SimulationConfig = {
        interval: 5000, // 默认发送间隔5秒
        devicesPerInterval: 3, // 默认每次发送3个设备数据
        randomize: true, // 默认随机选择数据
    };

    constructor(
        private configService: ConfigService,
        private queueService: QueueService,
        private devicesService: DevicesService,
        private dataCollectionService: DataCollectionService,
        private deviceGenerator: MockDeviceGeneratorService,
    ) {
        // 配置CSV文件路径，默认在项目根目录的mock_data文件夹中
        this.csvFilePath = this.configService.get<string>('MOCK_IOT_CSV_PATH') ||
            path.resolve(process.cwd(), 'mock_data', 'mock_iot_storage.csv');
    }

    async onModuleInit() {
        try {
            // 模块初始化时加载设备映射
            await this.loadDeviceMapping();
            // 预加载CSV数据
            await this.loadMockData();
            this.logger.log(`已加载${this.mockData.length}条模拟设备数据`);
        } catch (error) {
            this.logger.error(`模块初始化失败: ${error.message}`);
            // 失败时至少尝试加载CSV数据，不会影响基本功能
            try {
                await this.loadMockData();
            } catch (csvError) {
                this.logger.error(`加载CSV数据失败: ${csvError.message}`);
            }
        }
    }

    /**
     * 加载设备映射关系（设备标识符 -> 数据库设备ID）
     */
    private async loadDeviceMapping() {
        try {
            // 使用管理员角色查询所有设备
            const devices = await this.devicesService.findAll({ roles: [Role.ADMIN] });
            this.deviceMapping.clear(); // 清除旧映射

            let mappedCount = 0;
            devices.forEach(device => {
                if (device.deviceId) {
                    this.deviceMapping.set(device.deviceId, device.id);
                    mappedCount++;
                }
            });

            this.logger.log(`共找到${devices.length}个设备，成功映射${mappedCount}个设备关系`);

            // 如果没有映射关系，自动尝试同步设备
            if (mappedCount === 0 && devices.length === 0) {
                this.logger.warn('未找到任何设备，将尝试从CSV自动同步设备');
                await this.syncDevicesFromCsv(false); // 传递false参数表示不要在同步后重新加载映射
            } else if (mappedCount === 0 && devices.length > 0) {
                this.logger.warn('找到设备但没有deviceId，请检查设备配置');
            }
        } catch (error) {
            this.logger.error(`加载设备映射失败: ${error.message}`);
        }
    }

    /**
     * 从CSV文件加载模拟数据
     */
    async loadMockData(): Promise<void> {
        this.mockData = [];

        return new Promise((resolve, reject) => {
            // 检查文件是否存在
            if (!fs.existsSync(this.csvFilePath)) {
                this.logger.error(`CSV文件不存在: ${this.csvFilePath}`);
                return reject(new Error(`CSV文件不存在: ${this.csvFilePath}`));
            }

            fs.createReadStream(this.csvFilePath)
                .pipe(csv())
                .on('data', (data) => this.mockData.push(data))
                .on('end', () => {
                    this.logger.log(`从${this.csvFilePath}成功加载了${this.mockData.length}条数据`);
                    resolve();
                })
                .on('error', (error) => {
                    this.logger.error(`读取CSV文件失败: ${error.message}`);
                    reject(error);
                });
        });
    }

    /**
     * 开始持续模拟数据发送
     * @param config 模拟配置
     */
    startSimulation(config?: Partial<SimulationConfig>): {
        status: string,
        message: string,
        config: SimulationConfig
    } {
        // 如果已经在运行，先停止
        if (this.simulationActive) {
            this.stopSimulation();
        }

        // 更新配置
        if (config) {
            this.simulationConfig = { ...this.simulationConfig, ...config };
        }

        // 标记为活跃状态
        this.simulationActive = true;

        // 设置定时器定期发送数据
        this.simulationIntervalId = setInterval(() => {
            this.sendBatchData(this.simulationConfig.devicesPerInterval);
        }, this.simulationConfig.interval);

        this.logger.log(
            `开始模拟数据发送: 每${this.simulationConfig.interval}ms发送${this.simulationConfig.devicesPerInterval}条数据`
        );

        return {
            status: 'started',
            message: '已开始模拟数据发送',
            config: this.simulationConfig
        };
    }

    /**
     * 停止模拟数据发送
     */
    stopSimulation(): { status: string, message: string } {
        if (!this.simulationActive) {
            return {
                status: 'idle',
                message: '模拟已经处于停止状态'
            };
        }

        // 清除定时器
        if (this.simulationIntervalId) {
            clearInterval(this.simulationIntervalId);
            this.simulationIntervalId = null;
        }

        // 更新状态
        this.simulationActive = false;

        this.logger.log('已停止模拟数据发送');

        return {
            status: 'stopped',
            message: '已停止模拟数据发送'
        };
    }

    /**
     * 获取模拟状态
     */
    getSimulationStatus(): {
        active: boolean,
        config: SimulationConfig,
        dataInfo: { totalItems: number, filePath: string }
    } {
        return {
            active: this.simulationActive,
            config: this.simulationConfig,
            dataInfo: this.getMockDataStatus()
        };
    }

    /**
     * 发送一批数据
     */
    private sendBatchData(count: number): void {
        if (this.mockData.length === 0) {
            this.logger.warn('没有可用的模拟数据');
            return;
        }

        for (let i = 0; i < count; i++) {
            let index = i;
            if (this.simulationConfig.randomize) {
                index = Math.floor(Math.random() * this.mockData.length);
            } else {
                // 循环选择数据
                index = (i % this.mockData.length);
            }

            this.publishSingleItem(this.mockData[index]);
        }
    }

    /**
     * 一次性发布模拟数据（兼容原先的方法）
     * @param count 发布的数据条数，默认10条
     * @param interval 发布间隔(毫秒)，默认1000ms
     */
    async publishMockData(count: number = 10, interval: number = 1000): Promise<{ message: string, count: number }> {
        if (this.mockData.length === 0) {
            await this.loadMockData();
            if (this.mockData.length === 0) {
                throw new Error('没有可用的模拟数据');
            }
        }

        let publishedCount = 0;
        const maxCount = Math.min(count, this.mockData.length);

        // 随机选择数据并发布
        for (let i = 0; i < maxCount; i++) {
            setTimeout(() => {
                const randomIndex = Math.floor(Math.random() * this.mockData.length);
                const mockItem = this.mockData[randomIndex];
                this.publishSingleItem(mockItem);
                publishedCount++;
            }, i * interval);
        }

        return {
            message: `计划发布${maxCount}条模拟设备数据，间隔${interval}毫秒`,
            count: maxCount
        };
    }

    /**
     * 发布单条模拟数据
     * @param mockItem CSV中的一行数据
     */
    private publishSingleItem(mockItem: any): void {
        try {
            // 转换CSV数据为设备数据格式
            const deviceIdentifier = mockItem.device_id || mockItem.deviceId;
            const deviceId = this.deviceMapping.get(deviceIdentifier);

            if (!deviceId) {
                this.logger.warn(`设备标识符 ${deviceIdentifier} 在系统中找不到对应的设备ID`);
                return;
            }

            const dataType = mockItem.data_type || mockItem.type || 'power_consumption';
            const value = parseFloat(mockItem.value) || Math.random() * 100;

            // 创建设备数据DTO
            const deviceDataDto: CreateDeviceDataDto = {
                deviceId,
                type: dataType,
                value
            };

            // 使用数据采集服务创建设备数据
            // 这样会自动处理实体创建和发送到队列
            this.dataCollectionService.create(deviceDataDto)
                .then(createdData => {
                    this.logger.debug(`已发布设备 ${deviceId} 的${dataType}数据: ${value}`);
                })
                .catch(error => {
                    this.logger.error(`创建设备数据失败: ${error.message}`);
                });
        } catch (error) {
            this.logger.error(`发布模拟数据失败: ${error.message}`);
        }
    }

    /**
     * 获取当前加载的模拟数据状态
     */
    getMockDataStatus(): { totalItems: number, filePath: string } {
        return {
            totalItems: this.mockData.length,
            filePath: this.csvFilePath
        };
    }

    // 添加此方法以解决测试错误
    async getAllDeviceData() {
        // 返回所有设备数据
        return this.mockData;
    }

    // 添加此方法以解决测试错误
    async getDeviceDataById(id: string) {
        // 查找并返回指定ID的设备数据
        return this.mockData.find(device => device.id === id) || null;
    }

    // 添加创建设备数据方法
    async createDeviceData(deviceData: any) {
        // 实现创建设备数据的逻辑
        const newDevice = { ...deviceData, id: Date.now().toString() };
        this.mockData.push(newDevice);
        return newDevice;
    }

    // 添加更新设备数据方法
    async updateDeviceData(id: string, deviceData: any) {
        // 实现更新设备数据的逻辑
        const index = this.mockData.findIndex(device => device.id === id);
        if (index !== -1) {
            this.mockData[index] = { ...this.mockData[index], ...deviceData };
            return this.mockData[index];
        }
        return null;
    }

    // 添加删除设备数据方法
    async deleteDeviceData(id: string) {
        // 实现删除设备数据的逻辑
        const index = this.mockData.findIndex(device => device.id === id);
        if (index !== -1) {
            const deletedDevice = this.mockData[index];
            this.mockData.splice(index, 1);
            return deletedDevice;
        }
        return null;
    }

    /**
     * 将CSV文件中的设备与系统中的设备同步
     * @param reloadMapping 是否在同步后重新加载映射，默认为true
     */
    async syncDevicesFromCsv(reloadMapping: boolean = true): Promise<{ created: number, updated: number, total: number }> {
        if (this.mockData.length === 0) {
            await this.loadMockData();
        }

        // 获取CSV中的所有唯一设备标识符
        const csvDeviceIds = [...new Set(this.mockData.map(item => item.device_id || item.deviceId))];

        let created = 0;
        let updated = 0;

        for (const deviceId of csvDeviceIds) {
            // 检查设备是否存在
            const existingDevice = await this.devicesService.findByDeviceId(deviceId);

            if (!existingDevice) {
                // 创建新设备
                try {
                    const mockItem = this.mockData.find(item =>
                        (item.device_id || item.deviceId) === deviceId);

                    if (mockItem) {
                        // 使用设备生成器创建标准化设备
                        const newDevice = this.deviceGenerator.createBaseDevice(
                            deviceId,
                            `${deviceId}`,
                            '从CSV文件自动导入的设备'
                        );

                        // 添加其他属性
                        newDevice['location'] = '随机';

                        await this.devicesService.create({
                            name: newDevice.name || `模拟设备 ${deviceId}`,
                            description: newDevice.description || '从CSV文件自动导入的设备',
                            type: newDevice.type,
                            status: DeviceStatus.ACTIVE,
                            deviceId: deviceId,
                            serialNumber: deviceId,
                            energyType: newDevice.energyType || EnergyType.ELECTRICITY,
                            emissionFactor: newDevice.emissionFactor
                        });
                        created++;
                    }
                } catch (error) {
                    this.logger.error(`创建设备${deviceId}失败: ${error.message}`);
                }
            } else {
                // 设备已存在，可以选择更新一些信息
                updated++;
            }
        }

        // 只有在需要时才重新加载设备映射
        if (reloadMapping && (created > 0 || updated > 0)) {
            // 使用直接方式更新映射而不是递归调用
            const devices = await this.devicesService.findAll({ roles: [Role.ADMIN] });
            this.deviceMapping.clear();
            devices.forEach(device => {
                if (device.deviceId) {
                    this.deviceMapping.set(device.deviceId, device.id);
                }
            });
            this.logger.log(`同步后更新了设备映射，现有${this.deviceMapping.size}个映射关系`);
        }

        return {
            created,
            updated,
            total: csvDeviceIds.length
        };
    }

    /**
     * 生成并发布随机设备数据
     * @param options 生成随机数据的选项
     */
    async generateAndPublishRandomData(options: {
        count: number;
        deviceCount?: number;
        dataTypes?: string[];
        minValue?: number;
        maxValue?: number;
    }): Promise<{ message: string, count: number, devices: string[] }> {
        // 默认设置
        const count = options.count || 5;
        const minValue = options.minValue !== undefined ? options.minValue : 0;
        const maxValue = options.maxValue !== undefined ? options.maxValue : 100;
        const defaultDataTypes = ['power_consumption', 'temperature', 'humidity', 'fuel_level'];
        const dataTypes = options.dataTypes || defaultDataTypes;

        // 确保设备映射已加载
        if (this.deviceMapping.size === 0) {
            await this.loadDeviceMapping();
        }

        // 如果没有设备，直接返回
        if (this.deviceMapping.size === 0) {
            return {
                message: '没有可用的设备',
                count: 0,
                devices: []
            };
        }

        // 获取所有设备ID
        const allDeviceIds = Array.from(this.deviceMapping.keys());

        // 选择使用的设备数量
        const useDeviceCount = options.deviceCount ?
            Math.min(options.deviceCount, allDeviceIds.length) :
            allDeviceIds.length;

        // 随机选择设备
        const selectedDevices = this.getRandomElements(allDeviceIds, useDeviceCount);

        // 记录已发送数据的设备
        const usedDevices = new Set<string>();

        // 生成并发送随机数据
        for (let i = 0; i < count; i++) {
            // 随机选择一个设备
            const deviceIdentifier = this.getRandomElement(selectedDevices);
            const deviceId = this.deviceMapping.get(deviceIdentifier);

            if (deviceId) {
                // 随机选择一个数据类型
                const dataType = this.getRandomElement(dataTypes);

                // 生成随机值
                const value = this.getRandomNumber(minValue, maxValue);

                // 创建设备数据DTO
                const deviceDataDto: CreateDeviceDataDto = {
                    deviceId,
                    type: dataType,
                    value
                };

                // 发送数据
                try {
                    await this.dataCollectionService.create(deviceDataDto);
                    usedDevices.add(deviceIdentifier);
                    this.logger.debug(`已发送随机生成的设备数据: 设备=${deviceIdentifier}, 类型=${dataType}, 值=${value}`);
                } catch (error) {
                    this.logger.error(`发送随机数据失败: ${error.message}`);
                }
            }
        }

        return {
            message: `成功生成并发送${count}条随机设备数据`,
            count: count,
            devices: Array.from(usedDevices)
        };
    }

    /**
     * 从数组中随机获取一个元素
     */
    private getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * 从数组中随机获取指定数量的元素
     */
    private getRandomElements<T>(array: T[], count: number): T[] {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * 生成指定范围内的随机数
     */
    private getRandomNumber(min: number, max: number): number {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }

    // 将startMockDataSending重构为使用统一的状态管理
    startMockDataSending(interval: number = 5000, devicesPerInterval: number = 3, randomize: boolean = true): string {
        // 确保参数是有效的正数
        if (isNaN(interval) || interval <= 0) {
            interval = 5000;
        }

        if (isNaN(devicesPerInterval) || devicesPerInterval <= 0) {
            devicesPerInterval = 3;
        }

        // 停止之前正在运行的计时器（通过统一的停止方法）
        this.stopSimulation();

        // 标记为活跃状态
        this.simulationActive = true;

        // 启动新的定时发送
        this.simulationIntervalId = setInterval(() => {
            this.sendBatchData(devicesPerInterval);
        }, interval);

        this.logger.log(`开始模拟数据发送: 每${interval}ms发送${devicesPerInterval}条数据`);
        return `开始模拟数据发送: 每${interval}ms发送${devicesPerInterval}条数据`;
    }

    // 删除重复的停止方法，使用统一的stopSimulation
    stopMockDataSending(): void {
        this.stopSimulation();
    }

    /**
     * 生成碳排放监测设备
     * 提供对设备生成器的公共访问方法
     */
    async generateCarbonMonitoringDevices() {
        return this.deviceGenerator.generateCarbonMonitoringDevices();
    }

    /**
     * 获取所有模拟设备
     */
    getAllMockDevices() {
        return {
            success: true,
            devices: this.mockData,
            count: this.mockData.length
        };
    }

    /**
     * 创建新的模拟设备
     * @param deviceData 设备数据
     */
    async createMockDevice(deviceData: any) {
        // 验证设备数据
        if (!deviceData.deviceId || !deviceData.type) {
            throw new BadRequestException('设备ID和类型是必需的');
        }

        // 添加时间戳和ID
        const newDevice = {
            ...deviceData,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // 添加到模拟数据
        this.mockData.push(newDevice);

        // 尝试在数据库中创建设备
        try {
            await this.devicesService.create({
                name: newDevice.name || `模拟设备 ${newDevice.deviceId}`,
                description: newDevice.description || '通过API创建的模拟设备',
                type: newDevice.type,
                status: DeviceStatus.ACTIVE,
                deviceId: newDevice.deviceId,
                serialNumber: newDevice.deviceId,
                energyType: newDevice.energyType || EnergyType.ELECTRICITY,
                emissionFactor: newDevice.emissionFactor
            });
            this.logger.log(`成功在数据库中创建设备: ${newDevice.deviceId}`);
        } catch (error) {
            this.logger.warn(`无法在数据库中创建设备: ${error.message}`);
        }

        return {
            success: true,
            device: newDevice,
            message: '设备创建成功'
        };
    }

    /**
     * 获取指定的模拟设备
     * @param id 设备ID
     */
    getMockDeviceById(id: string) {
        const device = this.mockData.find(d => d.id === id || d.deviceId === id);

        if (!device) {
            throw new NotFoundException(`未找到ID为${id}的设备`);
        }

        return {
            success: true,
            device
        };
    }

    /**
     * 更新指定的模拟设备
     * @param id 设备ID
     * @param updateData 更新数据
     */
    updateMockDevice(id: string, updateData: any) {
        const index = this.mockData.findIndex(d => d.id === id || d.deviceId === id);

        if (index === -1) {
            throw new NotFoundException(`未找到ID为${id}的设备`);
        }

        // 更新数据
        this.mockData[index] = {
            ...this.mockData[index],
            ...updateData,
            updatedAt: new Date()
        };

        return {
            success: true,
            device: this.mockData[index],
            message: '设备更新成功'
        };
    }

    /**
     * 删除指定的模拟设备
     * @param id 设备ID
     */
    deleteMockDevice(id: string) {
        const index = this.mockData.findIndex(d => d.id === id || d.deviceId === id);

        if (index === -1) {
            throw new NotFoundException(`未找到ID为${id}的设备`);
        }

        // 删除设备
        const deletedDevice = this.mockData.splice(index, 1)[0];

        return {
            success: true,
            device: deletedDevice,
            message: '设备删除成功'
        };
    }
} 