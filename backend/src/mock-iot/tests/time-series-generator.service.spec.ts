import { Test, TestingModule } from '@nestjs/testing';
import { TimeSeriesGeneratorService } from '../services/time-series-generator.service';
import { DevicesService } from '../../devices/devices.service';
import { DataCollectionService } from '../../data-collection/data-collection.service';
import { DeviceType } from '../../devices/enums/device-type.enum';
import * as uuidModule from 'uuid';

// 正确模拟 uuid 模块
jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('test-task-id-123')
}));

describe('TimeSeriesGeneratorService', () => {
    let service: TimeSeriesGeneratorService;
    let devicesServiceMock: Partial<DevicesService>;
    let dataCollectionServiceMock: Partial<DataCollectionService>;

    // 模拟设备数据
    const mockCarbonSensors = [
        {
            id: 'carbon-sensor-1',
            deviceId: 'C001',
            name: '碳排放传感器1',
            type: DeviceType.CARBON_SENSOR
        },
        {
            id: 'carbon-sensor-2',
            deviceId: 'C002',
            name: '碳排放传感器2',
            type: DeviceType.CARBON_SENSOR
        }
    ];

    const mockEnergyMeters = [
        {
            id: 'energy-meter-1',
            deviceId: 'E001',
            name: '能源表1',
            type: DeviceType.ENERGY_METER
        }
    ];

    beforeEach(async () => {
        // 创建模拟服务
        devicesServiceMock = {
            findByType: jest.fn().mockImplementation((type: DeviceType) => {
                if (type === DeviceType.CARBON_SENSOR) return Promise.resolve(mockCarbonSensors);
                if (type === DeviceType.ENERGY_METER) return Promise.resolve(mockEnergyMeters);
                return Promise.resolve([]);
            }),
            findOne: jest.fn().mockImplementation((id: string) => {
                if (id === 'carbon-sensor-1') return Promise.resolve(mockCarbonSensors[0]);
                if (id === 'energy-meter-1') return Promise.resolve(mockEnergyMeters[0]);
                return Promise.resolve(null);
            })
        };

        dataCollectionServiceMock = {
            create: jest.fn().mockResolvedValue({ id: 'test-data-id' })
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TimeSeriesGeneratorService,
                { provide: DevicesService, useValue: devicesServiceMock },
                { provide: DataCollectionService, useValue: dataCollectionServiceMock }
            ],
        }).compile();

        service = module.get<TimeSeriesGeneratorService>(TimeSeriesGeneratorService);

        // 模拟setTimeout立即执行
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('generateCarbonEmissionTimeSeriesAsync', () => {
        it('应该创建任务并立即返回任务ID', async () => {
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-03');
            const result = await service.generateCarbonEmissionTimeSeriesAsync(startDate, endDate, 60);

            expect(result.success).toBe(true);
            expect(result.taskId).toBe('test-task-id-123');
            expect(result.message).toContain('已开始异步生成碳排放时间序列数据');
        });

        it('在后台应该开始处理任务', async () => {
            // 模拟内部实现
            const generateCarbonEmissionWithProgressSpy = jest.spyOn(service as any, 'generateCarbonEmissionTimeSeriesWithProgress')
                .mockResolvedValue({ success: true, count: 100 });

            await service.generateCarbonEmissionTimeSeriesAsync(
                new Date('2023-01-01'),
                new Date('2023-01-02'),
                60
            );

            // 运行所有定时器，包括setTimeout(0)
            jest.runAllTimers();

            // 等待所有Promise解析
            await Promise.resolve();

            // 检查是否调用了内部方法
            expect(generateCarbonEmissionWithProgressSpy).toHaveBeenCalled();
        });
    });

    describe('getTaskStatus', () => {
        it('应该返回指定任务的状态', async () => {
            // 先创建一个任务
            await service.generateCarbonEmissionTimeSeriesAsync(
                new Date('2023-01-01'),
                new Date('2023-01-02'),
                60
            );

            const status = service.getTaskStatus('test-task-id-123');
            expect(status.success).toBe(true);

            // 使用类型断言来告诉TypeScript这是已知的类型
            const successStatus = status as {
                success: true;
                status: string;
                taskId: string;
                progress: number;
                message: string;
            };

            expect(successStatus.status).toBe('pending');
            expect(successStatus.taskId).toBe('test-task-id-123');
        });

        it('对于不存在的任务ID应该返回错误', () => {
            const status = service.getTaskStatus('non-existent-task');
            expect(status.success).toBe(false);
            expect(status.message).toContain('不存在');
        });
    });

    describe('getAllTasks', () => {
        it('应该返回所有任务', async () => {
            // 创建一个任务
            await service.generateCarbonEmissionTimeSeriesAsync(
                new Date('2023-01-01'),
                new Date('2023-01-02'),
                60
            );

            // 设置第二个UUID模拟（重新设置是因为我们使用了全局模拟）
            (uuidModule.v4 as jest.Mock).mockReturnValueOnce('test-task-id-456');

            await service.generateCarbonEmissionTimeSeriesAsync(
                new Date('2023-02-01'),
                new Date('2023-02-02'),
                30
            );

            const result = service.getAllTasks();
            expect(result.success).toBe(true);
            expect(result.tasks.length).toBe(2);
            expect(result.tasks.some(t => t.taskId === 'test-task-id-123')).toBe(true);
            expect(result.tasks.some(t => t.taskId === 'test-task-id-456')).toBe(true);
        });
    });

    describe('generatePredictionDataset', () => {
        it('应该生成预测数据集', async () => {
            const result = await service.generatePredictionDataset(2, 60, true);

            expect(result.success).toBe(true);
            expect(result.message).toContain('成功生成碳排放预测数据集');
            expect(result.dataset.length).toBeGreaterThan(0);
            expect(result.targetDevice.id).toBe('carbon-sensor-1');

            // 检查是否创建了数据点
            expect(dataCollectionServiceMock.create).toHaveBeenCalled();
        });

        it('当没有碳传感器时应该返回错误', async () => {
            // 修改模拟返回空数组
            (devicesServiceMock.findByType as jest.Mock).mockResolvedValueOnce([]);

            const result = await service.generatePredictionDataset(2, 60, true);

            expect(result.success).toBe(false);
            expect(result.message).toContain('未找到碳排放传感器');
        });
    });
}); 