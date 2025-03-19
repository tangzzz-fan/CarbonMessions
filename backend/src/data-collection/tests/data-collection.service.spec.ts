import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataCollectionService } from '../data-collection.service';
import { DeviceData } from '../entities/device-data.entity';
import { DevicesService } from '../../devices/devices.service';
import { QueueService } from '../queue/queue.service';
import { NotFoundException } from '@nestjs/common';

describe('DataCollectionService', () => {
    let service: DataCollectionService;
    let deviceDataRepository: Repository<DeviceData>;
    let devicesService: DevicesService;
    let queueService: QueueService;

    const mockDeviceDataRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };

    const mockDevicesService = {
        findOne: jest.fn(),
    };

    const mockQueueService = {
        sendToProcessingQueue: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DataCollectionService,
                {
                    provide: getRepositoryToken(DeviceData),
                    useValue: mockDeviceDataRepository,
                },
                {
                    provide: DevicesService,
                    useValue: mockDevicesService,
                },
                {
                    provide: QueueService,
                    useValue: mockQueueService,
                },
            ],
        }).compile();

        service = module.get<DataCollectionService>(DataCollectionService);
        deviceDataRepository = module.get<Repository<DeviceData>>(getRepositoryToken(DeviceData));
        devicesService = module.get<DevicesService>(DevicesService);
        queueService = module.get<QueueService>(QueueService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const mockDeviceId = 'test-device-id';
        const mockCreateDto = {
            deviceId: mockDeviceId,
            value: 100,
            type: 'temperature',
        };

        it('should create device data successfully', async () => {
            const mockDevice = { id: mockDeviceId };
            const mockDeviceData = { ...mockCreateDto, timestamp: expect.any(Date) };
            const mockSavedData = { ...mockDeviceData, id: 'test-id' };

            mockDevicesService.findOne.mockResolvedValue(mockDevice);
            mockDeviceDataRepository.create.mockReturnValue(mockDeviceData);
            mockDeviceDataRepository.save.mockResolvedValue(mockSavedData);

            const result = await service.create(mockCreateDto);

            expect(result).toEqual(mockSavedData);
            expect(mockDevicesService.findOne).toHaveBeenCalledWith(mockDeviceId, null);
            expect(mockDeviceDataRepository.create).toHaveBeenCalledWith(expect.objectContaining(mockDeviceData));
            expect(mockDeviceDataRepository.save).toHaveBeenCalledWith(mockDeviceData);
            expect(mockQueueService.sendToProcessingQueue).toHaveBeenCalledWith(mockSavedData);
        });

        it('should throw NotFoundException when device not found', async () => {
            mockDevicesService.findOne.mockResolvedValue(null);

            await expect(service.create(mockCreateDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('createBatch', () => {
        const mockCreateDtos = [
            { deviceId: 'device-1', value: 100, type: 'temperature' },
            { deviceId: 'device-2', value: 200, type: 'humidity' },
        ];

        it('should create multiple device data records', async () => {
            const mockDevices = mockCreateDtos.map(dto => ({ id: dto.deviceId }));
            const mockSavedData = mockCreateDtos.map(dto => ({
                ...dto,
                id: `test-id-${dto.deviceId}`,
                timestamp: expect.any(Date),
            }));

            mockDevicesService.findOne.mockImplementation((deviceId) =>
                Promise.resolve(mockDevices.find(d => d.id === deviceId)),
            );
            mockDeviceDataRepository.create.mockImplementation(data => data);
            mockDeviceDataRepository.save.mockImplementation(data =>
                Promise.resolve({ ...data, id: `test-id-${data.deviceId}` }),
            );

            const result = await service.createBatch(mockCreateDtos);

            expect(result).toHaveLength(mockCreateDtos.length);
            expect(result).toEqual(expect.arrayContaining(mockSavedData));
        });
    });

    describe('findAll', () => {
        const mockQueryParams = {
            deviceId: 'test-device',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-02'),
            type: 'temperature',
        };

        it('should return device data based on query parameters', async () => {
            const mockData = [
                { id: '1', ...mockQueryParams, value: 100 },
                { id: '2', ...mockQueryParams, value: 200 },
            ];

            mockDeviceDataRepository.find.mockResolvedValue(mockData);

            const result = await service.findAll(mockQueryParams);

            expect(result).toEqual(mockData);
            expect(mockDeviceDataRepository.find).toHaveBeenCalledWith({
                where: expect.any(Object),
                order: { timestamp: 'DESC' },
            });
        });
    });
});