import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../../devices/devices.service';
import { DataCollectionService } from '../../data-collection/data-collection.service';
import { DeviceType } from '../../devices/enums/device-type.enum';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TimeSeriesGeneratorService {
    private readonly logger = new Logger(TimeSeriesGeneratorService.name);

    constructor(
        private devicesService: DevicesService,
        private dataCollectionService: DataCollectionService,
    ) { }

    // 在类中添加这些成员变量
    private readonly tasks: Map<string, {
        status: 'pending' | 'running' | 'completed' | 'failed';
        progress: number;
        message: string;
        result?: any;
        startTime: Date;
        endTime?: Date;
    }> = new Map();

    /**
     * 生成碳排放时间序列数据
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param interval 采样间隔(分钟)
     * @param options 配置选项
     */
    async generateCarbonEmissionTimeSeries(
        startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 默认过去30天
        endDate: Date = new Date(),
        interval: number = 60, // 默认1小时一个点
        options: {
            trend?: number;        // 趋势系数 (-0.5到0.5)
            seasonality?: number;  // 季节性强度 (0到1)
            noise?: number;        // 噪声强度 (0到1)
            outliers?: number;     // 异常值比例 (0到0.1)
            specificDevices?: string[]; // 指定设备ID列表
        } = {}
    ) {
        this.logger.log(`开始生成碳排放时间序列数据，时间范围: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        // 设置默认值
        const config = {
            trend: options.trend ?? 0.1,           // 默认轻微上升趋势
            seasonality: options.seasonality ?? 0.5, // 默认中等季节性波动
            noise: options.noise ?? 0.2,           // 默认轻微噪声
            outliers: options.outliers ?? 0.02,    // 默认2%的异常值
            specificDevices: options.specificDevices ?? []
        };

        // 创建模拟管理员用户对象，以便调用 findOne 方法
        const adminUser = { roles: ['admin'] };

        // 查找所有碳排放相关设备
        let devices = [];
        if (config.specificDevices.length > 0) {
            // 如果指定了设备ID，则只使用那些设备
            for (const deviceId of config.specificDevices) {
                // 添加 adminUser 作为第二个参数
                const device = await this.devicesService.findOne(deviceId, adminUser);
                if (device) devices.push(device);
            }
        } else {
            // 否则使用所有碳排放相关设备
            const carbonSensors = await this.devicesService.findByType(DeviceType.CARBON_SENSOR);
            const energyMeters = await this.devicesService.findByType(DeviceType.ENERGY_METER);
            const airQualityMonitors = await this.devicesService.findByType(DeviceType.AIR_QUALITY_MONITOR);
            const emissionsAnalyzers = await this.devicesService.findByType(DeviceType.EMISSIONS_ANALYZER);

            devices = [...carbonSensors, ...energyMeters, ...airQualityMonitors, ...emissionsAnalyzers];
        }

        if (devices.length === 0) {
            this.logger.warn('未找到任何碳排放相关设备，无法生成时间序列数据');
            return {
                success: false,
                message: '未找到任何碳排放相关设备，请先创建相关设备',
                timeSeries: []
            };
        }

        // 计算时间点总数
        const totalMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
        const totalPoints = Math.ceil(totalMinutes / interval);

        this.logger.log(`将生成${totalPoints}个时间点的数据，设备数量: ${devices.length}`);

        // 存储所有生成的数据点
        const timeSeriesData = [];
        let createdCount = 0;

        // 对每个设备生成时间序列数据
        for (const device of devices) {
            // 设备特定的基准值和波动范围
            const baseValue = this.getBaseValueForDeviceType(device.type);
            const range = baseValue * 0.6; // 波动范围为基准值的±30%

            // 生成时间点序列
            for (let i = 0; i < totalPoints; i++) {
                const currentTime = new Date(startDate.getTime() + i * interval * 60 * 1000);

                // 计算趋势组件 (随时间线性变化)
                const trendComponent = config.trend * (i / totalPoints) * baseValue;

                // 计算季节性组件 (每天、每周的周期变化)
                const hourOfDay = currentTime.getHours();
                const dayOfWeek = currentTime.getDay();

                // 日内模式: 工作时间(8-18点)排放较高，夜间较低
                const hourlyFactor = (hourOfDay >= 8 && hourOfDay <= 18)
                    ? 0.3 + 0.7 * Math.sin(Math.PI * (hourOfDay - 8) / 10)
                    : 0.3;

                // 周内模式: 工作日(1-5)排放较高，周末较低
                const dailyFactor = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.0 : 0.6;

                // 月度模式: 根据月份变化 (冬夏较高，春秋较低)
                const monthOfYear = currentTime.getMonth();
                const monthlyFactor = 0.8 + 0.4 * Math.sin(Math.PI * monthOfYear / 6);

                // 组合所有季节性因素
                const seasonalComponent = config.seasonality * range * hourlyFactor * dailyFactor * monthlyFactor;

                // 添加随机噪声
                const noiseComponent = (Math.random() * 2 - 1) * config.noise * range;

                // 计算是否为异常值
                const isOutlier = Math.random() < config.outliers;

                // 如果是异常值，则添加一个较大的随机波动
                const outlierComponent = isOutlier ? (Math.random() * 2 - 1) * range * 2 : 0;

                // 计算最终值 = 基准值 + 趋势 + 季节性 + 噪声 + 异常
                const finalValue = Math.max(0, baseValue + trendComponent + seasonalComponent + noiseComponent + outlierComponent);

                // 获取设备类型对应的数据类型
                const dataType = this.getDataTypeForDeviceType(device.type);

                // 创建设备数据
                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: dataType,
                    value: finalValue,
                    metadata: {
                        generated: true,
                        dateTime: currentTime.toISOString(),
                        trend: trendComponent,
                        seasonality: seasonalComponent,
                        noise: noiseComponent,
                        isOutlier
                    }
                });

                // 添加到时间序列结果
                timeSeriesData.push({
                    deviceId: device.deviceId,
                    type: dataType,
                    value: finalValue,
                    timestamp: currentTime,
                    components: {
                        base: baseValue,
                        trend: trendComponent,
                        seasonal: seasonalComponent,
                        noise: noiseComponent,
                        outlier: outlierComponent
                    }
                });

                createdCount++;
            }
        }

        this.logger.log(`碳排放时间序列数据生成完成，共生成${createdCount}条数据`);

        return {
            success: true,
            message: `成功生成${createdCount}条碳排放时间序列数据`,
            count: createdCount,
            timeSeriesData: timeSeriesData.slice(0, 10), // 仅返回前10条样例
            devices: devices.map(d => ({ id: d.id, deviceId: d.deviceId, name: d.name }))
        };
    }

    /**
     * 异步生成碳排放时间序列数据
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param interval 采样间隔(分钟)
     * @param options 配置选项
     */
    async generateCarbonEmissionTimeSeriesAsync(
        startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: Date = new Date(),
        interval: number = 60,
        options: {
            trend?: number;
            seasonality?: number;
            noise?: number;
            outliers?: number;
            specificDevices?: string[];
        } = {}
    ): Promise<{ success: boolean; message: string; taskId: string }> {
        const taskId = uuid();

        // 创建新任务
        this.tasks.set(taskId, {
            status: 'pending',
            progress: 0,
            message: '任务已创建，等待处理',
            startTime: new Date(),
        });

        // 在后台异步执行
        setTimeout(async () => {
            try {
                // 更新任务状态为运行中
                this.tasks.set(taskId, {
                    ...this.tasks.get(taskId),
                    status: 'running',
                    message: '正在生成碳排放时间序列数据...'
                });

                // 执行实际的数据生成逻辑
                const result = await this.generateCarbonEmissionTimeSeriesWithProgress(
                    startDate, endDate, interval, options, taskId
                );

                // 更新任务状态为完成
                this.tasks.set(taskId, {
                    ...this.tasks.get(taskId),
                    status: 'completed',
                    progress: 100,
                    message: `成功生成${result.count}条碳排放时间序列数据`,
                    result,
                    endTime: new Date()
                });
            } catch (error) {
                // 更新任务状态为失败
                this.tasks.set(taskId, {
                    ...this.tasks.get(taskId),
                    status: 'failed',
                    message: `生成碳排放时间序列数据失败: ${error.message}`,
                    endTime: new Date()
                });
                this.logger.error(`任务 ${taskId} 执行失败: ${error.message}`);
            }
        }, 0);

        return {
            success: true,
            message: `已开始异步生成碳排放时间序列数据，使用参数: 间隔=${interval}分钟，趋势=${options.trend ?? 0.1}`,
            taskId
        };
    }

    /**
     * 带进度追踪的碳排放时间序列数据生成
     * 这是一个内部方法，用于支持异步任务执行
     */
    private async generateCarbonEmissionTimeSeriesWithProgress(
        startDate: Date,
        endDate: Date,
        interval: number,
        options: any,
        taskId: string
    ) {
        // 设置默认值
        const config = {
            trend: options.trend ?? 0.1,
            seasonality: options.seasonality ?? 0.5,
            noise: options.noise ?? 0.2,
            outliers: options.outliers ?? 0.02,
            specificDevices: options.specificDevices ?? []
        };

        // 创建模拟管理员用户对象，以便调用 findOne 方法
        const adminUser = { roles: ['admin'] };

        // 查找所有碳排放相关设备
        let devices = [];
        if (config.specificDevices.length > 0) {
            // 如果指定了设备ID，则只使用那些设备
            for (const deviceId of config.specificDevices) {
                const device = await this.devicesService.findOne(deviceId, adminUser);
                if (device) devices.push(device);
            }
        } else {
            // 否则使用所有碳排放相关设备
            const carbonSensors = await this.devicesService.findByType(DeviceType.CARBON_SENSOR);
            const energyMeters = await this.devicesService.findByType(DeviceType.ENERGY_METER);
            const airQualityMonitors = await this.devicesService.findByType(DeviceType.AIR_QUALITY_MONITOR);
            const emissionsAnalyzers = await this.devicesService.findByType(DeviceType.EMISSIONS_ANALYZER);

            devices = [...carbonSensors, ...energyMeters, ...airQualityMonitors, ...emissionsAnalyzers];
        }

        if (devices.length === 0) {
            this.logger.warn('未找到任何碳排放相关设备，无法生成时间序列数据');
            throw new Error('未找到任何碳排放相关设备，请先创建相关设备');
        }

        // 计算时间点总数
        const totalMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
        const totalPoints = Math.ceil(totalMinutes / interval);

        this.logger.log(`将生成${totalPoints}个时间点的数据，设备数量: ${devices.length}`);

        // 更新任务状态
        this.tasks.set(taskId, {
            ...this.tasks.get(taskId),
            message: `将生成${totalPoints * devices.length}条数据，设备数量: ${devices.length}`
        });

        // 存储所有生成的数据点
        const timeSeriesData = [];
        let createdCount = 0;
        let processedDevices = 0;

        // 对每个设备生成时间序列数据
        for (const device of devices) {
            // 设备特定的基准值和波动范围
            const baseValue = this.getBaseValueForDeviceType(device.type);
            const range = baseValue * 0.6; // 波动范围为基准值的±30%

            // 生成时间点序列
            for (let i = 0; i < totalPoints; i++) {
                const currentTime = new Date(startDate.getTime() + i * interval * 60 * 1000);

                // 计算趋势组件 (随时间线性变化)
                const trendComponent = config.trend * (i / totalPoints) * baseValue;

                // 计算季节性组件 (每天、每周的周期变化)
                const hourOfDay = currentTime.getHours();
                const dayOfWeek = currentTime.getDay();

                // 日内模式: 工作时间(8-18点)排放较高，夜间较低
                const hourlyFactor = (hourOfDay >= 8 && hourOfDay <= 18)
                    ? 0.3 + 0.7 * Math.sin(Math.PI * (hourOfDay - 8) / 10)
                    : 0.3;

                // 周内模式: 工作日(1-5)排放较高，周末较低
                const dailyFactor = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.0 : 0.6;

                // 月度模式: 根据月份变化 (冬夏较高，春秋较低)
                const monthOfYear = currentTime.getMonth();
                const monthlyFactor = 0.8 + 0.4 * Math.sin(Math.PI * monthOfYear / 6);

                // 组合所有季节性因素
                const seasonalComponent = config.seasonality * range * hourlyFactor * dailyFactor * monthlyFactor;

                // 添加随机噪声
                const noiseComponent = (Math.random() * 2 - 1) * config.noise * range;

                // 计算是否为异常值
                const isOutlier = Math.random() < config.outliers;

                // 如果是异常值，则添加一个较大的随机波动
                const outlierComponent = isOutlier ? (Math.random() * 2 - 1) * range * 2 : 0;

                // 计算最终值 = 基准值 + 趋势 + 季节性 + 噪声 + 异常
                const finalValue = Math.max(0, baseValue + trendComponent + seasonalComponent + noiseComponent + outlierComponent);

                // 获取设备类型对应的数据类型
                const dataType = this.getDataTypeForDeviceType(device.type);

                // 创建设备数据
                await this.dataCollectionService.create({
                    deviceId: device.id,
                    type: dataType,
                    value: finalValue,
                    metadata: {
                        generated: true,
                        dateTime: currentTime.toISOString(),
                        trend: trendComponent,
                        seasonality: seasonalComponent,
                        noise: noiseComponent,
                        isOutlier
                    }
                });

                // 添加到时间序列结果
                timeSeriesData.push({
                    deviceId: device.deviceId,
                    type: dataType,
                    value: finalValue,
                    timestamp: currentTime,
                    components: {
                        base: baseValue,
                        trend: trendComponent,
                        seasonal: seasonalComponent,
                        noise: noiseComponent,
                        outlier: outlierComponent
                    }
                });

                createdCount++;

                // 每处理100个数据点更新一次进度
                if (createdCount % 100 === 0) {
                    const progress = Math.min(95, Math.floor((createdCount / (totalPoints * devices.length)) * 100));
                    this.tasks.set(taskId, {
                        ...this.tasks.get(taskId),
                        progress,
                        message: `已处理 ${createdCount}/${totalPoints * devices.length} 条数据 (${progress}%)`
                    });
                }
            }

            processedDevices++;
            this.logger.log(`已完成设备 ${processedDevices}/${devices.length} 的数据生成`);
        }

        this.logger.log(`碳排放时间序列数据生成完成，共生成${createdCount}条数据`);

        return {
            success: true,
            message: `成功生成${createdCount}条碳排放时间序列数据`,
            count: createdCount,
            timeSeriesData: timeSeriesData.slice(0, 10), // 仅返回前10条样例
            devices: devices.map(d => ({ id: d.id, deviceId: d.deviceId, name: d.name }))
        };
    }

    /**
     * 获取所有任务状态
     */
    getAllTasks() {
        const tasksArray = Array.from(this.tasks.entries()).map(([taskId, task]) => ({
            taskId,
            ...task
        }));

        return {
            success: true,
            tasks: tasksArray
        };
    }

    /**
     * 获取指定任务的状态
     * @param taskId 任务ID
     */
    getTaskStatus(taskId: string) {
        const task = this.tasks.get(taskId);

        if (!task) {
            return {
                success: false,
                message: `任务 ${taskId} 不存在`
            };
        }

        return {
            success: true,
            taskId,
            ...task
        };
    }

    // 辅助方法：根据设备类型获取基准值
    private getBaseValueForDeviceType(deviceType: DeviceType): number {
        switch (deviceType) {
            case DeviceType.CARBON_SENSOR:
                return 75;  // 基准碳排放值 (单位可能是kg CO2/h)
            case DeviceType.ENERGY_METER:
                return 120; // 基准能耗值 (单位可能是kWh)
            case DeviceType.AIR_QUALITY_MONITOR:
                return 50;  // 基准空气质量指数
            case DeviceType.EMISSIONS_ANALYZER:
                return 65;  // 基准排放分析值
            default:
                return 100; // 默认值
        }
    }

    // 辅助方法：根据设备类型获取数据类型
    private getDataTypeForDeviceType(deviceType: DeviceType): string {
        switch (deviceType) {
            case DeviceType.CARBON_SENSOR:
                return 'carbon_emission';
            case DeviceType.ENERGY_METER:
                return 'power_consumption';
            case DeviceType.AIR_QUALITY_MONITOR:
                return 'air_quality_index';
            case DeviceType.EMISSIONS_ANALYZER:
                return 'emission_analysis';
            default:
                return 'measurement';
        }
    }

    /**
     * 生成用于预测的碳排放数据集
     * 包括碳排放值和影响因素（温度、湿度、人员密度等）
     * @param days 天数
     * @param interval 采样间隔(分钟)
     * @param includeFactors 是否包含影响因素
     */
    async generatePredictionDataset(days: number = 90, interval: number = 60, includeFactors: boolean = true) {
        this.logger.log(`开始生成碳排放预测数据集，天数: ${days}，间隔: ${interval}分钟`);

        // 设置时间范围
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // 找到关键设备
        const carbonSensors = await this.devicesService.findByType(DeviceType.CARBON_SENSOR);
        const energyMeters = await this.devicesService.findByType(DeviceType.ENERGY_METER);

        if (carbonSensors.length === 0) {
            return {
                success: false,
                message: '未找到碳排放传感器，无法生成预测数据集'
            };
        }

        // 使用第一个碳传感器作为目标设备
        const targetSensor = carbonSensors[0];

        // 计算总点数
        const totalMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
        const totalPoints = Math.ceil(totalMinutes / interval);

        this.logger.log(`将生成${totalPoints}个预测数据点`);

        // 存储生成的预测数据集
        const predictionData = [];

        // 生成各影响因素的基础值
        for (let i = 0; i < totalPoints; i++) {
            const currentTime = new Date(startDate.getTime() + i * interval * 60 * 1000);
            const hourOfDay = currentTime.getHours();
            const dayOfWeek = currentTime.getDay();
            const monthOfYear = currentTime.getMonth();

            // 温度: 日内变化 + 季节性 + 长期趋势 + 随机波动
            // 白天高晚上低，夏季高冬季低
            const dayBasedTemp = (hourOfDay >= 8 && hourOfDay <= 18)
                ? 15 + 10 * Math.sin(Math.PI * (hourOfDay - 8) / 10)
                : 15;
            const seasonTemp = 5 * Math.sin(Math.PI * (monthOfYear - 2) / 6); // 冬季低，夏季高
            const temperature = dayBasedTemp + seasonTemp + (Math.random() * 5 - 2.5);

            // 湿度: 与温度有一定的负相关性 + 随机波动
            const baseHumidity = 60 - (temperature - 15) * 1.5; // 温度越高，湿度越低
            const humidity = Math.max(30, Math.min(90, baseHumidity + (Math.random() * 10 - 5)));

            // 人员密度: 工作时间高 + 工作日高
            const timeBasedOccupancy = (hourOfDay >= 8 && hourOfDay <= 18) ? (0.4 + 0.6 * Math.sin(Math.PI * (hourOfDay - 8) / 10)) : 0.1;
            const dayBasedOccupancy = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.0 : 0.3;
            const occupancy = 100 * timeBasedOccupancy * dayBasedOccupancy * (0.9 + Math.random() * 0.2);

            // 交通流量: 早晚高峰 + 工作日高
            let trafficFactor = 0.2; // 基础流量
            if ((hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 17 && hourOfDay <= 19)) {
                trafficFactor = 0.8 + Math.random() * 0.4; // 早晚高峰
            } else if (hourOfDay >= 10 && hourOfDay <= 16) {
                trafficFactor = 0.5 + Math.random() * 0.3; // 工作时间
            }
            trafficFactor *= (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.0 : 0.4; // 工作日系数
            const traffic = Math.round(50 * trafficFactor);

            // 生产活动: 工作时间高 + 季节性变化 + 长期趋势
            const timeBasedProduction = (hourOfDay >= 8 && hourOfDay <= 20) ? (0.5 + 0.5 * Math.sin(Math.PI * (hourOfDay - 8) / 12)) : 0.3;
            const trendFactor = 1 + 0.002 * i; // 微小增长趋势
            const production = 80 * timeBasedProduction * (0.8 + 0.4 * Math.sin(Math.PI * monthOfYear / 6)) * trendFactor * (0.95 + Math.random() * 0.1);

            // 模拟各因素对碳排放的影响
            // 一个简化的模型：碳排放 = 基础排放 + 温度影响 + 人员影响 + 交通影响 + 生产影响 + 随机因素
            const baseEmission = 50; // 基础排放值
            const tempEffect = 0.5 * (temperature - 15); // 温度偏离15度的影响
            const occupancyEffect = 0.2 * occupancy; // 人员密度影响
            const trafficEffect = 0.8 * traffic; // 交通流量影响
            const productionEffect = 0.3 * production; // 生产活动影响
            const randomEffect = (Math.random() * 20 - 10); // 随机波动

            // 计算总排放值
            let totalEmission = baseEmission + tempEffect + occupancyEffect + trafficEffect + productionEffect + randomEffect;
            totalEmission = Math.max(10, Math.round(totalEmission * 10) / 10); // 确保大于10且保留一位小数

            // 创建碳排放数据点
            await this.dataCollectionService.create({
                deviceId: targetSensor.id,
                type: 'carbon_emission',
                value: totalEmission,
                metadata: {
                    generated: true,
                    prediction_dataset: true,
                    dateTime: currentTime.toISOString(),
                    temperature,
                    humidity,
                    occupancy,
                    traffic,
                    production
                }
            });

            // 同时为能源表生成相关的能耗数据 (与碳排放高度相关)
            for (const meter of energyMeters.slice(0, 3)) { // 只使用前3个能源表
                // 能耗数据，与碳排放高度相关但有独特模式
                const energyConsumption = totalEmission * (0.7 + Math.random() * 0.6) *
                    (meter.id.includes('main') ? 1.2 : 0.9); // 主要能源表消耗更高

                await this.dataCollectionService.create({
                    deviceId: meter.id,
                    type: 'power_consumption',
                    value: energyConsumption,
                    metadata: {
                        generated: true,
                        prediction_dataset: true,
                        dateTime: currentTime.toISOString()
                    }
                });
            }

            // 构建预测数据集记录
            predictionData.push({
                timestamp: currentTime,
                carbon_emission: totalEmission,
                temperature,
                humidity,
                occupancy,
                traffic,
                production
            });

            // 每1000个点记录一次进度
            if (i % 1000 === 0 || i === totalPoints - 1) {
                this.logger.log(`已生成 ${i + 1}/${totalPoints} 个预测数据集数据点`);
            }
        }

        this.logger.log(`碳排放预测数据集生成完成，共生成 ${totalPoints} 个数据点`);

        return {
            success: true,
            message: `成功生成碳排放预测数据集，共 ${totalPoints} 个数据点`,
            dataset: predictionData.slice(0, 100), // 只返回前100个示例
            totalPoints,
            timeRange: {
                start: startDate,
                end: endDate,
                intervalMinutes: interval
            },
            targetDevice: {
                id: targetSensor.id,
                deviceId: targetSensor.deviceId,
                name: targetSensor.name
            }
        };
    }
} 