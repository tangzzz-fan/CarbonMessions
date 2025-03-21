import { Test, TestingModule } from '@nestjs/testing';
import { MockIotController } from '../mock-iot.controller';
import { MockIotService } from '../mock-iot.service';
import { ScenarioGeneratorService } from '../services/scenario-generator.service';
import { TimePatternGeneratorService } from '../services/time-pattern-generator.service';
import { MockDeviceGeneratorService } from '../services/mock-device-generator.service';
import { TimeSeriesGeneratorService } from '../services/time-series-generator.service';
import { BadRequestException } from '@nestjs/common';

describe('MockIotController', () => {
    let controller: MockIotController;
    let timeSeriesGeneratorService: Partial<TimeSeriesGeneratorService>;
    let scenarioGeneratorService: Partial<ScenarioGeneratorService>;

    beforeEach(async () => {
        // 创建模拟服务
        const mockIotServiceMock = {};
        scenarioGeneratorService = {
            startLoadingScenarioAsync: jest.fn().mockResolvedValue({
                success: true,
                taskId: 'scenario-task-123',
                message: '已开始异步模拟装卸区作业场景'
            })
        };

        const timePatternGeneratorServiceMock = {};
        const mockDeviceGeneratorServiceMock = {};

        timeSeriesGeneratorService = {
            generateCarbonEmissionTimeSeries: jest.fn().mockResolvedValue({
                success: true,
                count: 100,
            }),
            generateCarbonEmissionTimeSeriesAsync: jest.fn().mockResolvedValue({
                success: true,
                taskId: 'mock-task-id',
                message: '已开始异步生成碳排放时间序列数据'
            }),
            generatePredictionDataset: jest.fn().mockResolvedValue({
                success: true,
                dataset: [],
                totalPoints: 48
            }),
            getTaskStatus: jest.fn().mockImplementation((taskId) => {
                return { success: true, taskId, status: 'running', progress: 30 };
            }),
            getAllTasks: jest.fn().mockReturnValue({ success: true, tasks: [] })
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MockIotController],
            providers: [
                { provide: MockIotService, useValue: mockIotServiceMock },
                { provide: ScenarioGeneratorService, useValue: scenarioGeneratorService },
                { provide: TimePatternGeneratorService, useValue: timePatternGeneratorServiceMock },
                { provide: MockDeviceGeneratorService, useValue: mockDeviceGeneratorServiceMock },
                { provide: TimeSeriesGeneratorService, useValue: timeSeriesGeneratorService },
            ],
        }).compile();

        controller = module.get<MockIotController>(MockIotController);
    });

    describe('generateCarbonEmissionTimeSeriesAsync', () => {
        it('应该使用有效参数异步生成碳排放数据', async () => {
            const result = await controller.generateCarbonEmissionTimeSeriesAsync('30', '60', '0.1', '0.5', '0.2');

            expect(timeSeriesGeneratorService.generateCarbonEmissionTimeSeriesAsync).toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                taskId: 'mock-task-id',
                message: '已开始异步生成碳排放时间序列数据'
            });
        });

        it('使用无效的天数参数应该抛出异常', async () => {
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('0', '60')).rejects.toThrow(BadRequestException);
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('500', '60')).rejects.toThrow(BadRequestException);
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('not-a-number', '60')).rejects.toThrow(BadRequestException);
        });

        it('使用无效的间隔参数应该抛出异常', async () => {
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('30', '0')).rejects.toThrow(BadRequestException);
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('30', '2000')).rejects.toThrow(BadRequestException);
            await expect(controller.generateCarbonEmissionTimeSeriesAsync('30', 'not-a-number')).rejects.toThrow(BadRequestException);
        });
    });

    describe('getTaskStatus', () => {
        it('应该调用服务中的getTaskStatus方法并返回任务状态', () => {
            const result = controller.getTaskStatus('test-task-id');

            expect(timeSeriesGeneratorService.getTaskStatus).toHaveBeenCalledWith('test-task-id');
            expect(result).toEqual({
                success: true,
                taskId: 'test-task-id',
                status: 'running',
                progress: 30
            });
        });
    });

    describe('getAllTasks', () => {
        it('应该调用服务中的getAllTasks方法并返回所有任务', () => {
            const result = controller.getAllTasks();

            expect(timeSeriesGeneratorService.getAllTasks).toHaveBeenCalled();
            expect(result).toEqual({ success: true, tasks: [] });
        });
    });

    describe('generatePredictionDataset', () => {
        it('应该使用有效参数生成预测数据集', async () => {
            const result = await controller.generatePredictionDataset('90', '60', 'true');

            expect(timeSeriesGeneratorService.generatePredictionDataset).toHaveBeenCalledWith(90, 60, true);
            expect(result).toEqual({
                success: true,
                dataset: [],
                totalPoints: 48
            });
        });
    });
}); 