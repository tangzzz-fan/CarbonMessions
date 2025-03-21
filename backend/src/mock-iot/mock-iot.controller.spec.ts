import { Test, TestingModule } from '@nestjs/testing';
import { MockIotController } from './mock-iot.controller';
import { MockIotService } from './mock-iot.service';
import { TimePatternGeneratorService } from './services/time-pattern-generator.service';
import { MockDeviceGeneratorService } from './services/mock-device-generator.service';
import { TimeSeriesGeneratorService } from './services/time-series-generator.service';
import { ScenarioGeneratorService } from './services/scenario-generator.service';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../data-collection/queue/queue.service';
import { DevicesService } from '../devices/devices.service';
import { DataCollectionService } from '../data-collection/data-collection.service';

describe('MockIotController', () => {
    let controller: MockIotController;
    let mockIotService: MockIotService;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 创建所有依赖的模拟
        const mockScenarioGeneratorService = {
            runScenario: jest.fn(),
            getScenarios: jest.fn().mockReturnValue([]),
            getActiveScenarios: jest.fn().mockReturnValue([]),
        };

        const mockTimePatternGeneratorService = {
            generateTimePatterns: jest.fn(),
        };

        const mockDeviceGeneratorService = {
            generateCarbonMonitoringDevices: jest.fn(),
            createBaseDevice: jest.fn(),
        };

        const mockTimeSeriesGeneratorService = {
            generateTimeSeries: jest.fn(),
        };

        const mockQueueService = {
            sendToProcessingQueue: jest.fn(),
            sendToPredictionQueue: jest.fn(),
        };

        const mockDevicesService = {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            findByDeviceId: jest.fn(),
            create: jest.fn(),
        };

        const mockDataCollectionService = {
            create: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn().mockImplementation((key) => {
                // 根据需要返回默认配置
                if (key === 'MOCK_IOT_CSV_PATH') return './mock_data/test.csv';
                return null;
            }),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [MockIotController],
            providers: [
                MockIotService,
                {
                    provide: ScenarioGeneratorService,
                    useValue: mockScenarioGeneratorService,
                },
                {
                    provide: TimePatternGeneratorService,
                    useValue: mockTimePatternGeneratorService,
                },
                {
                    provide: MockDeviceGeneratorService,
                    useValue: mockDeviceGeneratorService,
                },
                {
                    provide: TimeSeriesGeneratorService,
                    useValue: mockTimeSeriesGeneratorService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: QueueService,
                    useValue: mockQueueService,
                },
                {
                    provide: DevicesService,
                    useValue: mockDevicesService,
                },
                {
                    provide: DataCollectionService,
                    useValue: mockDataCollectionService,
                },
            ],
        }).compile();

        controller = moduleRef.get<MockIotController>(MockIotController);
        mockIotService = moduleRef.get<MockIotService>(MockIotService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllDeviceData', () => {
        it('应该返回所有设备数据', async () => {
            const result = { success: true, devices: [], count: 0 };
            const spy = jest.spyOn(mockIotService, 'getAllMockDevices').mockReturnValue(result);

            const response = await controller.getAllMockDevices();

            expect(spy).toHaveBeenCalled();
            expect(response).toEqual(result);
        });
    });

    describe('getDeviceDataById', () => {
        it('应该返回指定ID的设备数据', async () => {
            const result = { success: true, device: { id: '1', name: 'test' } };
            const spy = jest.spyOn(mockIotService, 'getMockDeviceById').mockReturnValue(result);

            const response = await controller.getMockDeviceById('1');

            expect(spy).toHaveBeenCalledWith('1');
            expect(response).toEqual(result);
        });
    });

    describe('generateRandomData', () => {
        it('应该生成并发送随机设备数据', async () => {
            const count = 5;
            const result = { message: '成功', count: 5, devices: [] };
            jest.spyOn(mockIotService, 'generateAndPublishRandomData').mockResolvedValue(result);

            expect(await controller.generateRandomData(count)).toBe(result);
        });
    });
}); 