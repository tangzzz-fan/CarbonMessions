import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { QueueService } from '../data-collection/queue/queue.service';
import { CreateDeviceDataDto } from '../data-collection/dto/create-device-data.dto';
import { DevicesService } from '../devices/devices.service';
import { DataCollectionService } from '../data-collection/data-collection.service';
import { SimulationConfig } from './interfaces/simulation-config.interface';

@Injectable()
export class MockIotService implements OnModuleInit {
    private readonly logger = new Logger(MockIotService.name);
    private readonly csvFilePath: string;
    private mockData: any[] = [];
    private deviceMapping: Map<string, string> = new Map(); // 映射设备标识到设备ID
    private simulationActive = false; // 是否正在进行模拟
    private simulationIntervalId: NodeJS.Timeout | null = null; // 模拟定时器ID
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
    ) {
        // 配置CSV文件路径，默认在项目根目录的mock_data文件夹中
        this.csvFilePath = this.configService.get<string>('MOCK_IOT_CSV_PATH') ||
            path.resolve(process.cwd(), 'mock_data', 'mock_iot_storage.csv');
    }

    async onModuleInit() {
        // 模块初始化时加载设备映射
        await this.loadDeviceMapping();
        // 预加载CSV数据
        await this.loadMockData();
        this.logger.log(`已加载${this.mockData.length}条模拟设备数据`);
    }

    /**
     * 加载设备映射关系（设备标识符 -> 数据库设备ID）
     */
    private async loadDeviceMapping() {
        try {
            // 获取系统中所有设备
            const devices = await this.devicesService.findAll({});
            devices.forEach(device => {
                if (device.deviceId) {
                    this.deviceMapping.set(device.deviceId, device.id);
                }
            });
            this.logger.log(`已加载${this.deviceMapping.size}个设备映射关系`);
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
} 