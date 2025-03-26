import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DeviceData } from './entities/device-data.entity';
import { QueueService } from './queue/queue.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class DataProcessingService implements OnModuleInit {
    private readonly logger = new Logger(DataProcessingService.name);
    private readonly pythonPredictionServiceUrl: string;

    constructor(
        private queueService: QueueService,
        private httpService: HttpService,
        private configService: ConfigService,
    ) {
        this.pythonPredictionServiceUrl = this.configService.get<string>('PYTHON_PREDICTION_SERVICE_URL') || 'http://localhost:8000';
    }

    // 实现OnModuleInit接口，确保在模块初始化时启动消费者
    async onModuleInit() {
        this.logger.log('DataProcessingService initialized. Starting queue consumer...');
        await this.startProcessingQueueConsumer();
    }

    /**
     * 启动处理队列的消费者
     */
    private async startProcessingQueueConsumer() {
        try {
            this.logger.log('Starting processing queue consumer...');
            await this.queueService.consumeProcessingQueue(async (data) => {
                this.logger.debug(`Received data from processing queue: ${JSON.stringify(data)}`);
                await this.processData(data);
            });
            this.logger.log('Processing queue consumer started successfully');
        } catch (error) {
            this.logger.error(`Failed to start processing queue consumer: ${error.message}`);
        }
    }

    /**
     * 处理设备数据
     * @param data 设备数据
     */
    async processData(data: DeviceData) {
        try {
            this.logger.debug(`Processing data for device ${data.deviceId}, type: ${data.type}`);

            // 1. 数据验证和清洗
            const cleanedData = this.cleanData(data);

            // 2. 数据转换 - 根据不同类型的设备数据进行转换
            const transformedData = this.transformData(cleanedData);

            // 3. 发送到预测队列 或 直接调用预测服务
            if (this.shouldUsePredictionService(transformedData)) {
                this.logger.debug(`Sending data to prediction service for device ${data.deviceId}`);
                await this.sendToPredictionService(transformedData);
            } else {
                this.logger.debug(`Sending data to prediction queue for device ${data.deviceId}`);
                await this.queueService.sendToPredictionQueue(transformedData);
            }

            this.logger.log(`Successfully processed data for device ${data.deviceId}`);
        } catch (error) {
            this.logger.error(`Failed to process data for device ${data.deviceId}: ${error.message}`);
            throw error; // 重新抛出异常，让队列处理
        }
    }

    /**
     * 清洗数据
     * @param data 原始设备数据
     * @returns 清洗后的数据
     */
    private cleanData(data: DeviceData): DeviceData {
        // 实现数据清洗逻辑
        // 例如：移除异常值、填充缺失值等

        // 简单示例：如果值为负数，设置为0
        if (data.value < 0) {
            this.logger.warn(`Corrected negative value for device ${data.deviceId}: ${data.value} -> 0`);
            const cleanedData = { ...data };
            cleanedData.value = 0;
            return cleanedData;
        }

        return data;
    }

    /**
     * 转换数据
     * @param data 清洗后的设备数据
     * @returns 转换后的数据
     */
    private transformData(data: DeviceData): any {
        // 根据数据类型进行不同的转换
        switch (data.type) {
            case 'temperature':
                // 温度数据转换逻辑
                return {
                    ...data,
                    transformedValue: data.value * 1.8 + 32, // 转换为华氏度
                    unit: 'F',
                };
            case 'power_consumption':
                // 能耗数据转换逻辑
                return {
                    ...data,
                    co2Equivalent: this.calculateCO2Equivalent(data.value),
                    unit: 'kgCO2',
                };
            default:
                // 默认不做转换
                return {
                    ...data,
                    unit: this.getDefaultUnit(data.type),
                };
        }
    }

    /**
     * 获取默认单位
     * @param type 数据类型
     * @returns 默认单位
     */
    private getDefaultUnit(type: string): string {
        const unitMap = {
            temperature: 'C',
            humidity: '%',
            power_consumption: 'kWh',
            pressure: 'hPa',
            // 添加更多类型和单位映射
        };

        return unitMap[type] || 'unit';
    }

    /**
     * 计算二氧化碳当量
     * @param powerConsumption 能耗
     * @returns 二氧化碳当量
     */
    private calculateCO2Equivalent(powerConsumption: number): number {
        // 简单的二氧化碳当量计算 (示例值)
        // 实际应用中，应根据地区和能源结构调整系数
        const CO2_PER_KWH = 0.5; // kg CO2 / kWh
        return powerConsumption * CO2_PER_KWH;
    }

    /**
     * 判断是否应该使用预测服务
     * @param data 转换后的数据
     * @returns 是否应使用预测服务
     */
    private shouldUsePredictionService(data: any): boolean {
        // 根据数据类型或其他条件决定是否直接调用预测服务
        // 例如，某些紧急数据可能需要立即预测而不是通过队列
        return data.type === 'power_consumption';
    }

    /**
     * 发送数据到Python预测服务
     * @param data 转换后的数据
     */
    private async sendToPredictionService(data: any) {
        try {
            const response = await firstValueFrom<AxiosResponse>(
                this.httpService.post(`${this.pythonPredictionServiceUrl}/predict`, data)
            );
            this.logger.log(`Prediction service response: ${JSON.stringify(response.data)}`);
        } catch (error) {
            this.logger.error(`Failed to send data to prediction service: ${error.message}`);
            // 如果HTTP调用失败，退回到队列方式
            this.queueService.sendToPredictionQueue(data);
        }
    }
}