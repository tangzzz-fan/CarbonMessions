import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../../devices/devices.service';
import { DataCollectionService } from '../../data-collection/data-collection.service';
import { CreateDeviceDataDto } from '../../data-collection/dto/create-device-data.dto';
import { DeviceType } from '../../devices/enums/device-type.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScenarioGeneratorService {
    private readonly logger = new Logger(ScenarioGeneratorService.name);
    private simulationTasks = new Map<string, {
        id: string,
        type: string,
        status: 'running' | 'completed' | 'failed',
        startTime: Date,
        endTime?: Date,
        progress: number,
        error?: string
    }>();

    constructor(
        private devicesService: DevicesService,
        private dataCollectionService: DataCollectionService,
    ) { }

    /**
     * 模拟车辆进入园区的完整流程数据
     * @param count 车辆数量
     */
    async generateVehicleEntryScenario(count: number = 1) {
        const results = [];

        // 获取相关设备
        const entranceGates = await this.devicesService.findByType(DeviceType.GATE);
        const weightScales = await this.devicesService.findByType(DeviceType.WEIGHT_SCALE);
        const cameras = await this.devicesService.findByType(DeviceType.CAMERA);

        if (!entranceGates.length || !weightScales.length) {
            this.logger.warn('缺少必要设备，无法生成车辆进场场景数据');
            return { success: false, message: '缺少必要设备' };
        }

        for (let i = 0; i < count; i++) {
            const entryTime = new Date();
            const vehicleId = `TRUCK-${Math.floor(Math.random() * 10000)}`;
            const vehicleWeight = 5000 + Math.random() * 20000; // 5-25吨

            // 步骤1: 门禁系统识别
            const gate = entranceGates[Math.floor(Math.random() * entranceGates.length)];
            await this.dataCollectionService.create({
                deviceId: gate.id,
                type: 'vehicle_detection',
                value: 1,  // 检测到车辆
                metadata: { vehicleId, action: 'entry' }
            });
            await this.sleep(1000);

            // 步骤2: 摄像头识别车牌
            if (cameras.length) {
                const camera = cameras[Math.floor(Math.random() * cameras.length)];
                await this.dataCollectionService.create({
                    deviceId: camera.id,
                    type: 'license_plate_recognition',
                    value: 1, // 识别成功
                    metadata: { vehicleId, plateNumber: `粤B${Math.floor(Math.random() * 100000)}` }
                });
                await this.sleep(500);
            }

            // 步骤3: 重量测量
            const scale = weightScales[Math.floor(Math.random() * weightScales.length)];
            await this.dataCollectionService.create({
                deviceId: scale.id,
                type: 'weight_measurement',
                value: vehicleWeight,
                metadata: { vehicleId }
            });

            // 步骤4: 门禁开启，记录功耗变化
            await this.dataCollectionService.create({
                deviceId: gate.id,
                type: 'power_consumption',
                value: 2.5 + Math.random() * 1.5, // 开门时功率上升
                metadata: { vehicleId, action: 'gate_open' }
            });
            await this.sleep(3000);

            // 步骤5: 门禁关闭，功耗恢复
            await this.dataCollectionService.create({
                deviceId: gate.id,
                type: 'power_consumption',
                value: 0.8 + Math.random() * 0.4, // 待机功耗
                metadata: { vehicleId, action: 'gate_close' }
            });

            results.push({
                vehicleId,
                entryTime,
                gateId: gate.id,
                weight: vehicleWeight,
            });
        }

        return {
            success: true,
            message: `成功生成${count}辆车入场场景数据`,
            data: results
        };
    }

    /**
     * 模拟装卸区设备在货物处理过程中的数据变化
     * @param duration 持续时间（分钟）
     * @param interval 数据生成间隔（分钟）
     */
    async generateLoadingScenario(duration: number = 60, interval: number = 5) {
        // 获取装卸区相关设备
        const loaders = await this.devicesService.findByType(DeviceType.LOADER);
        const conveyors = await this.devicesService.findByType(DeviceType.CONVEYOR);
        const forklifts = await this.devicesService.findByType(DeviceType.FORKLIFT);

        if (!loaders.length && !conveyors.length && !forklifts.length) {
            this.logger.warn('缺少装卸区设备，无法生成装卸场景数据');
            return { success: false, message: '缺少必要设备' };
        }

        const iterations = Math.ceil(duration / interval);
        const allEquipment = [...loaders, ...conveyors, ...forklifts];

        // 模拟装卸区的工作周期
        const workCycle = {
            idle: { power: [0.5, 1.5], load: [0, 10], status: 0 },
            loading: { power: [5, 15], load: [50, 80], status: 1 },
            heavyLoading: { power: [12, 25], load: [75, 100], status: 2 },
            unloading: { power: [8, 20], load: [40, 70], status: 1 },
        };

        // 记录各设备当前状态
        const equipmentStatus = new Map();
        allEquipment.forEach(eq => {
            equipmentStatus.set(eq.id, 'idle');
        });

        // 按指定间隔生成数据
        for (let i = 0; i < iterations; i++) {
            // 根据时间段调整设备工作状态
            // 前30%时间: 大部分设备从待机转为装载状态
            // 30%-70%时间: 高负载装卸状态
            // 70%-100%时间: 逐渐回到待机状态

            const timeProgress = i / iterations;

            for (const equipment of allEquipment) {
                let newStatus = equipmentStatus.get(equipment.id);

                // 状态转换逻辑
                if (timeProgress < 0.3) {
                    // 初始阶段，设备开始工作
                    if (Math.random() < 0.4) {
                        newStatus = 'loading';
                    }
                } else if (timeProgress < 0.7) {
                    // 高峰期，大部分设备高负载工作
                    if (Math.random() < 0.6) {
                        newStatus = 'heavyLoading';
                    } else if (Math.random() < 0.3) {
                        newStatus = 'loading';
                    }
                } else {
                    // 收尾阶段，设备逐渐转为卸载和待机
                    if (newStatus === 'heavyLoading' && Math.random() < 0.7) {
                        newStatus = 'unloading';
                    } else if (newStatus !== 'idle' && Math.random() < 0.3) {
                        newStatus = 'idle';
                    }
                }

                equipmentStatus.set(equipment.id, newStatus);

                // 根据状态生成对应数据
                const statusData = workCycle[newStatus];
                const power = statusData.power[0] + Math.random() * (statusData.power[1] - statusData.power[0]);
                const load = statusData.load[0] + Math.random() * (statusData.load[1] - statusData.load[0]);

                // 发送功耗数据
                await this.dataCollectionService.create({
                    deviceId: equipment.id,
                    type: 'power_consumption',
                    value: power,
                    metadata: { status: newStatus }
                });

                // 发送负载数据
                await this.dataCollectionService.create({
                    deviceId: equipment.id,
                    type: 'load',
                    value: load,
                    metadata: { status: newStatus }
                });

                // 设备类型特定数据
                if (equipment.type === DeviceType.FORKLIFT) {
                    // 叉车还会上报行驶速度和电池状态
                    const speed = newStatus === 'idle' ? 0 : 2 + Math.random() * 8;
                    const battery = 50 - (i * 50 / iterations); // 电量逐渐下降

                    await this.dataCollectionService.create({
                        deviceId: equipment.id,
                        type: 'speed',
                        value: speed,
                        metadata: { status: newStatus }
                    });

                    await this.dataCollectionService.create({
                        deviceId: equipment.id,
                        type: 'battery_level',
                        value: battery,
                        metadata: { status: newStatus }
                    });
                }
            }

            // 等待指定间隔时间
            await this.sleep(interval * 60 * 1000);
        }

        return {
            success: true,
            message: `成功模拟${duration}分钟装卸区作业数据，间隔${interval}分钟`,
            devices: allEquipment.length
        };
    }

    /**
     * 模拟碳排放高峰期场景
     * 生成高能耗、高排放的数据模式
     */
    async generateCarbonPeakScenario() {
        this.logger.log('开始生成碳排放高峰期场景数据');

        // 查找所有碳排放相关设备
        const carbonSensors = await this.devicesService.findByType(DeviceType.CARBON_SENSOR);
        const energyMeters = await this.devicesService.findByType(DeviceType.ENERGY_METER);
        const airQualityMonitors = await this.devicesService.findByType(DeviceType.AIR_QUALITY_MONITOR);

        // 查找可能产生高能耗的设备
        const hvacSystems = await this.devicesService.findByType(DeviceType.HVAC);
        const trucks = await this.devicesService.findByType(DeviceType.TRUCK);
        const forklifts = await this.devicesService.findByType(DeviceType.FORKLIFT);

        const results = [];

        // 为碳传感器生成高排放数据
        for (const sensor of carbonSensors) {
            const peakValue = 80 + Math.random() * 50; // 高碳排放值，范围80-130
            await this.dataCollectionService.create({
                deviceId: sensor.id,
                type: 'carbon_emission',
                value: peakValue,
                metadata: { scenario: 'carbon_peak', status: 'alert' }
            });

            results.push({
                deviceId: sensor.deviceId,
                type: 'carbon_emission',
                value: peakValue
            });
        }

        // 为能源表生成高能耗数据
        for (const meter of energyMeters) {
            const peakValue = 75 + Math.random() * 55; // 高能耗，范围75-130
            await this.dataCollectionService.create({
                deviceId: meter.id,
                type: 'power_consumption',
                value: peakValue,
                metadata: { scenario: 'carbon_peak', load: 'high' }
            });

            results.push({
                deviceId: meter.deviceId,
                type: 'power_consumption',
                value: peakValue
            });
        }

        // 为空气质量监测器生成较差的空气质量数据
        for (const monitor of airQualityMonitors) {
            const peakValue = 180 + Math.random() * 120; // 较差的空气质量，范围180-300
            await this.dataCollectionService.create({
                deviceId: monitor.id,
                type: 'air_quality_index',
                value: peakValue,
                metadata: { scenario: 'carbon_peak', quality: 'poor' }
            });

            results.push({
                deviceId: monitor.deviceId,
                type: 'air_quality_index',
                value: peakValue
            });
        }

        // 为HVAC系统生成高负载数据
        for (const hvac of hvacSystems) {
            const loadValue = 85 + Math.random() * 15; // 高负载，范围85-100%
            await this.dataCollectionService.create({
                deviceId: hvac.id,
                type: 'load_percentage',
                value: loadValue,
                metadata: { scenario: 'carbon_peak' }
            });

            results.push({
                deviceId: hvac.deviceId,
                type: 'load_percentage',
                value: loadValue
            });
        }

        // 为车辆生成高活动量数据
        const vehicles = [...trucks, ...forklifts];
        for (const vehicle of vehicles) {
            const usageValue = 70 + Math.random() * 30; // 高使用率，范围70-100%
            await this.dataCollectionService.create({
                deviceId: vehicle.id,
                type: 'usage_rate',
                value: usageValue,
                metadata: { scenario: 'carbon_peak', status: 'heavy_use' }
            });

            results.push({
                deviceId: vehicle.deviceId,
                type: 'usage_rate',
                value: usageValue
            });
        }

        return {
            success: true,
            message: '成功生成碳排放高峰期场景数据',
            samplesCount: results.length,
            samples: results.slice(0, 10) // 只返回前10个样本数据防止响应过大
        };
    }

    /**
     * 模拟碳减排措施场景
     * 生成低能耗、减排效果的数据模式
     */
    async generateCarbonReductionScenario() {
        this.logger.log('开始生成碳减排措施场景数据');

        // 查找所有碳排放相关设备
        const carbonSensors = await this.devicesService.findByType(DeviceType.CARBON_SENSOR);
        const energyMeters = await this.devicesService.findByType(DeviceType.ENERGY_METER);
        const solarPanels = await this.devicesService.findByType(DeviceType.SOLAR_PANEL);
        const smartGrids = await this.devicesService.findByType(DeviceType.SMART_GRID);

        // 查找其他相关设备
        const hvacSystems = await this.devicesService.findByType(DeviceType.HVAC);
        const lightings = await this.devicesService.findByType(DeviceType.LIGHTING);

        const results = [];

        // 为碳传感器生成低排放数据
        for (const sensor of carbonSensors) {
            const lowValue = 20 + Math.random() * 30; // 低碳排放值，范围20-50
            await this.dataCollectionService.create({
                deviceId: sensor.id,
                type: 'carbon_emission',
                value: lowValue,
                metadata: { scenario: 'carbon_reduction', status: 'optimal' }
            });

            results.push({
                deviceId: sensor.deviceId,
                type: 'carbon_emission',
                value: lowValue
            });
        }

        // 为能源表生成低能耗数据
        for (const meter of energyMeters) {
            const lowValue = 15 + Math.random() * 25; // 低能耗，范围15-40
            await this.dataCollectionService.create({
                deviceId: meter.id,
                type: 'power_consumption',
                value: lowValue,
                metadata: { scenario: 'carbon_reduction', load: 'optimized' }
            });

            results.push({
                deviceId: meter.deviceId,
                type: 'power_consumption',
                value: lowValue
            });
        }

        // 为太阳能电池板生成高产能数据
        for (const panel of solarPanels) {
            const highValue = 70 + Math.random() * 30; // 高产能，范围70-100%
            await this.dataCollectionService.create({
                deviceId: panel.id,
                type: 'power_generation',
                value: highValue,
                metadata: { scenario: 'carbon_reduction', efficiency: 'high' }
            });

            results.push({
                deviceId: panel.deviceId,
                type: 'power_generation',
                value: highValue
            });
        }

        // 为智能电网连接设备生成优化调度数据
        for (const grid of smartGrids) {
            const optimizationValue = 85 + Math.random() * 15; // 优化程度，范围85-100%
            await this.dataCollectionService.create({
                deviceId: grid.id,
                type: 'optimization_rate',
                value: optimizationValue,
                metadata: { scenario: 'carbon_reduction', mode: 'eco' }
            });

            results.push({
                deviceId: grid.deviceId,
                type: 'optimization_rate',
                value: optimizationValue
            });
        }

        // 为HVAC系统生成节能模式数据
        for (const hvac of hvacSystems) {
            const ecoValue = 30 + Math.random() * 20; // 节能模式，范围30-50%
            await this.dataCollectionService.create({
                deviceId: hvac.id,
                type: 'eco_mode_level',
                value: ecoValue,
                metadata: { scenario: 'carbon_reduction', mode: 'energy_saving' }
            });

            results.push({
                deviceId: hvac.deviceId,
                type: 'eco_mode_level',
                value: ecoValue
            });
        }

        // 为照明系统生成智能照明数据
        for (const light of lightings) {
            const dimValue = 40 + Math.random() * 30; // 智能调光，范围40-70%
            await this.dataCollectionService.create({
                deviceId: light.id,
                type: 'brightness_level',
                value: dimValue,
                metadata: { scenario: 'carbon_reduction', mode: 'smart_lighting' }
            });

            results.push({
                deviceId: light.deviceId,
                type: 'brightness_level',
                value: dimValue
            });
        }

        return {
            success: true,
            message: '成功生成碳减排措施场景数据',
            samplesCount: results.length,
            samples: results.slice(0, 10) // 只返回前10个样本数据防止响应过大
        };
    }

    /**
     * 异步模拟装卸区设备在货物处理过程中的数据变化
     * 立即返回任务ID，后台执行模拟
     * @param duration 持续时间（分钟）
     * @param interval 数据生成间隔（分钟）
     */
    startLoadingScenarioAsync(duration: number = 60, interval: number = 5) {
        const taskId = uuidv4();

        // 记录新任务
        this.simulationTasks.set(taskId, {
            id: taskId,
            type: 'loading_scenario',
            status: 'running',
            startTime: new Date(),
            progress: 0
        });

        // 后台异步执行模拟
        this.runLoadingScenarioAsync(taskId, duration, interval);

        return {
            success: true,
            message: `已开始异步模拟装卸区${duration}分钟的作业数据，间隔${interval}分钟`,
            taskId: taskId
        };
    }

    /**
     * 获取模拟任务状态
     * @param taskId 任务ID
     */
    getTaskStatus(taskId: string) {
        const task = this.simulationTasks.get(taskId);
        if (!task) {
            return {
                success: false,
                message: `未找到ID为${taskId}的模拟任务`
            };
        }

        return {
            success: true,
            task
        };
    }

    /**
     * 获取所有运行中的任务
     */
    getAllTasks() {
        return {
            success: true,
            tasks: Array.from(this.simulationTasks.values())
        };
    }

    /**
     * 后台运行装卸区模拟
     * 此方法不会阻塞，而是在后台运行
     */
    private async runLoadingScenarioAsync(taskId: string, duration: number, interval: number) {
        try {
            // 查找所有相关设备
            const loaders = await this.devicesService.findByType(DeviceType.LOADER);
            const conveyors = await this.devicesService.findByType(DeviceType.CONVEYOR);
            const forklifts = await this.devicesService.findByType(DeviceType.FORKLIFT);

            // 合并所有设备
            const allEquipment = [...loaders, ...conveyors, ...forklifts];

            if (allEquipment.length === 0) {
                this.updateTaskStatus(taskId, 'failed', '未找到任何装卸区设备');
                return;
            }

            // 计算总迭代次数
            const iterations = Math.ceil(duration / interval);
            let currentIteration = 0;

            // 装卸作业设备状态周期：闲置->启动->运行->高负载->降速->闲置
            const workCycle = {
                'idle': { power: [5, 15], load: [0, 5] },
                'startup': { power: [30, 50], load: [10, 20] },
                'running': { power: [60, 80], load: [40, 60] },
                'high_load': { power: [85, 95], load: [70, 90] },
                'slowing': { power: [40, 60], load: [30, 50] }
            };

            const statusSequence = ['idle', 'startup', 'running', 'high_load', 'running', 'slowing', 'idle'];

            // 为每个设备分配随机的起始状态索引，使设备不同步运行
            const equipmentStatus = new Map();
            allEquipment.forEach(eq => {
                equipmentStatus.set(eq.id, Math.floor(Math.random() * statusSequence.length));
            });

            // 模拟迭代
            for (let i = 0; i < iterations; i++) {
                currentIteration = i;

                // 更新进度
                this.updateTaskProgress(taskId, (i / iterations) * 100);

                // 为每个设备生成当前状态的数据
                for (const equipment of allEquipment) {
                    // 获取设备当前状态索引，并向前移动
                    let statusIndex = equipmentStatus.get(equipment.id);
                    statusIndex = (statusIndex + 1) % statusSequence.length;
                    equipmentStatus.set(equipment.id, statusIndex);

                    // 获取当前状态
                    const newStatus = statusSequence[statusIndex];

                    // 根据状态生成对应数据
                    const statusData = workCycle[newStatus];
                    const power = statusData.power[0] + Math.random() * (statusData.power[1] - statusData.power[0]);
                    const load = statusData.load[0] + Math.random() * (statusData.load[1] - statusData.load[0]);

                    // 发送功耗数据
                    await this.dataCollectionService.create({
                        deviceId: equipment.id,
                        type: 'power_consumption',
                        value: power,
                        metadata: { status: newStatus }
                    });

                    // 发送负载数据
                    await this.dataCollectionService.create({
                        deviceId: equipment.id,
                        type: 'load',
                        value: load,
                        metadata: { status: newStatus }
                    });

                    // 设备类型特定数据
                    if (equipment.type === DeviceType.FORKLIFT) {
                        // 叉车还会上报行驶速度和电池状态
                        const speed = newStatus === 'idle' ? 0 : 2 + Math.random() * 8;
                        const battery = 50 - (i * 50 / iterations); // 电量逐渐下降

                        await this.dataCollectionService.create({
                            deviceId: equipment.id,
                            type: 'speed',
                            value: speed,
                            metadata: { status: newStatus }
                        });

                        await this.dataCollectionService.create({
                            deviceId: equipment.id,
                            type: 'battery_level',
                            value: battery,
                            metadata: { status: newStatus }
                        });
                    }
                }

                // 等待指定间隔时间
                await this.sleep(interval * 60 * 1000);
            }

            // 更新任务为已完成
            this.updateTaskStatus(taskId, 'completed');

        } catch (error) {
            this.logger.error(`装卸区模拟失败: ${error.message}`);
            this.updateTaskStatus(taskId, 'failed', error.message);
        }
    }

    /**
     * 更新任务进度
     */
    private updateTaskProgress(taskId: string, progress: number) {
        const task = this.simulationTasks.get(taskId);
        if (task) {
            task.progress = Math.min(Math.round(progress), 100);
            this.simulationTasks.set(taskId, task);
        }
    }

    /**
     * 更新任务状态
     */
    private updateTaskStatus(taskId: string, status: 'running' | 'completed' | 'failed', error?: string) {
        const task = this.simulationTasks.get(taskId);
        if (task) {
            task.status = status;
            if (status === 'completed' || status === 'failed') {
                task.endTime = new Date();
            }
            if (error) {
                task.error = error;
            }
            this.simulationTasks.set(taskId, task);
        }
    }

    /**
     * 工具方法：等待指定毫秒数
     */
    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 