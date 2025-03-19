import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectionController } from '../data-collection.controller';
import { DataCollectionService } from '../data-collection.service';
import { CreateDeviceDataDto } from '../dto/create-device-data.dto';
import { QueryDeviceDataDto } from '../dto/query-device-data.dto';
import { DeviceData } from '../entities/device-data.entity';
import { RolesService } from '../../users/roles/roles.service';
import { Role } from '../../users/enums/role.enum';

describe('DataCollectionController', () => {
    let controller: DataCollectionController;
    let service: DataCollectionService;

    const mockDataCollectionService = {
        create: jest.fn(),
        createBatch: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        findLatestByDeviceId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DataCollectionController],
            providers: [
                {
                    provide: DataCollectionService,
                    useValue: mockDataCollectionService,
                },
                {
                    provide: RolesService,
                    useValue: {
                        canManageRole: jest.fn().mockReturnValue(true),
                        getRoleDetails: jest.fn().mockReturnValue({ permissions: [] })
                    }
                },
                {
                    provide: 'Reflector',
                    useValue: {
                        get: jest.fn().mockReturnValue([Role.ADMIN, Role.OPERATOR]),
                        getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN, Role.OPERATOR])
                    }
                }
            ],
        }).compile();

        controller = module.get<DataCollectionController>(DataCollectionController);
        service = module.get<DataCollectionService>(DataCollectionService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        const mockCreateDto: CreateDeviceDataDto = {
            deviceId: 'test-device-id',
            value: 100,
            type: 'temperature',
        };

        it('should create a device data record', async () => {
            const mockResult = { id: 'test-id', ...mockCreateDto };
            mockDataCollectionService.create.mockResolvedValue(mockResult);

            const result = await controller.create(mockCreateDto);

            expect(result).toEqual(mockResult);
            expect(mockDataCollectionService.create).toHaveBeenCalledWith(mockCreateDto);
        });
    });

    describe('createBatch', () => {
        const mockCreateDtos: CreateDeviceDataDto[] = [
            { deviceId: 'device-1', value: 100, type: 'temperature' },
            { deviceId: 'device-2', value: 200, type: 'humidity' },
        ];

        it('should create multiple device data records', async () => {
            const mockResults = mockCreateDtos.map(dto => ({ id: `test-id-${dto.deviceId}`, ...dto }));
            mockDataCollectionService.createBatch.mockResolvedValue(mockResults);

            const result = await controller.createBatch(mockCreateDtos);

            expect(result).toEqual(mockResults);
            expect(mockDataCollectionService.createBatch).toHaveBeenCalledWith(mockCreateDtos);
        });
    });

    describe('findAll', () => {
        const mockQueryParams: QueryDeviceDataDto = {
            deviceId: 'test-device',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-02'),
            type: 'temperature',
        };

        it('should return device data based on query parameters', async () => {
            const mockResults = [
                { id: '1', deviceId: 'test-device', value: 100, type: 'temperature' },
                { id: '2', deviceId: 'test-device', value: 200, type: 'temperature' },
            ];
            mockDataCollectionService.findAll.mockResolvedValue(mockResults);

            const result = await controller.findAll(mockQueryParams);

            expect(result).toEqual(mockResults);
            expect(mockDataCollectionService.findAll).toHaveBeenCalledWith(mockQueryParams);
        });
    });

    describe('findOne', () => {
        const mockId = 'test-id';

        it('should return a device data record by id', async () => {
            const mockResult = { id: mockId, deviceId: 'test-device', value: 100, type: 'temperature' };
            mockDataCollectionService.findOne.mockResolvedValue(mockResult);

            const result = await controller.findOne(mockId);

            expect(result).toEqual(mockResult);
            expect(mockDataCollectionService.findOne).toHaveBeenCalledWith(mockId);
        });
    });

    describe('findLatest', () => {
        const mockDeviceId = 'test-device';
        const mockType = 'temperature';

        it('should return latest device data', async () => {
            const mockResult = {
                id: 'test-id',
                deviceId: mockDeviceId,
                value: 100,
                type: mockType,
                timestamp: new Date(),
            };
            mockDataCollectionService.findLatestByDeviceId.mockResolvedValue(mockResult);

            const result = await controller.findLatest(mockDeviceId, mockType);

            expect(result).toEqual(mockResult);
            expect(mockDataCollectionService.findLatestByDeviceId).toHaveBeenCalledWith(mockDeviceId, mockType);
        });
    });
});