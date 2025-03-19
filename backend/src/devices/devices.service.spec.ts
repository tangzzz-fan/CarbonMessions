import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { UsersService } from '../users/users.service';
import { NotFoundException } from '@nestjs/common';
import { DeviceStatus } from './enums/device-status.enum';
import { DeviceType } from './enums/device-type.enum';
import { EnergyType } from './enums/energy-type.enum';

describe('DevicesService', () => {
    let service: DevicesService;
    let deviceRepository: Repository<Device>;
    let usersService: UsersService;

    const mockDeviceRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            andWhere: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
    };

    const mockUsersService = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DevicesService,
                {
                    provide: getRepositoryToken(Device),
                    useValue: mockDeviceRepository,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        service = module.get<DevicesService>(DevicesService);
        deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
        usersService = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a device successfully', async () => {
            const createDeviceDto = {
                name: 'Test Device',
                type: DeviceType.TRUCK,
                status: DeviceStatus.ACTIVE,
                energyType: EnergyType.DIESEL,
                operatorId: 'operator-id'
            };

            const mockDevice = {
                id: 'device-uuid',
                ...createDeviceDto,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockUsersService.findOne.mockResolvedValue({ id: 'operator-id' });
            mockDeviceRepository.create.mockReturnValue(mockDevice);
            mockDeviceRepository.save.mockResolvedValue(mockDevice);

            const result = await service.create(createDeviceDto);

            expect(result).toEqual(mockDevice);
            expect(mockUsersService.findOne).toHaveBeenCalledWith('operator-id');
            expect(mockDeviceRepository.create).toHaveBeenCalledWith(createDeviceDto);
            expect(mockDeviceRepository.save).toHaveBeenCalledWith(mockDevice);
        });
    });

    describe('findAll', () => {
        it('should return array of devices with filters', async () => {
            const queryParams = {
                name: 'Test',
                type: DeviceType.TRUCK,
                status: DeviceStatus.ACTIVE,
                energyType: EnergyType.DIESEL,
                location: 'Warehouse',
                operatorId: 'operator-id',
                isActive: true
            };

            const mockDevices = [
                { id: 'device-1', name: 'Test Device 1' },
                { id: 'device-2', name: 'Test Device 2' }
            ];

            const queryBuilder = {
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockDevices)
            };
            mockDeviceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

            const result = await service.findAll(queryParams);

            expect(result).toEqual(mockDevices);
            expect(mockDeviceRepository.createQueryBuilder).toHaveBeenCalledWith('device');
            expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('device.operator', 'user');

            if (queryParams.name) {
                expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                    'device.name LIKE :name',
                    { name: `%${queryParams.name}%` }
                );
            }
            if (queryParams.type) {
                expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                    'device.type = :type',
                    { type: queryParams.type }
                );
            }
            if (queryParams.status) {
                expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                    'device.status = :status',
                    { status: queryParams.status }
                );
            }
        });

        it('should return empty array when no devices found', async () => {
            const queryParams = {};
            const queryBuilder = {
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([])
            };
            mockDeviceRepository.createQueryBuilder.mockReturnValue(queryBuilder);

            const result = await service.findAll(queryParams);

            expect(result).toEqual([]);
            expect(mockDeviceRepository.createQueryBuilder).toHaveBeenCalledWith('device');
            expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('device.operator', 'user');
        });
    });

    describe('findOne', () => {
        it('should return a device by id', async () => {
            const mockUser = { roles: ['admin'] };
            const mockDevice = {
                id: 'device-uuid',
                name: 'Test Device'
            };

            mockDeviceRepository.findOne.mockResolvedValue(mockDevice);

            const result = await service.findOne('device-uuid', mockUser);
            expect(result).toEqual(mockDevice);
        });

        it('should throw NotFoundException for non-existent device', async () => {
            const mockUser = { roles: ['admin'] };
            mockDeviceRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne('non-existent-id', mockUser))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a device successfully', async () => {
            const updateDeviceDto = {
                name: 'Updated Device',
                status: DeviceStatus.MAINTENANCE,
                operatorId: 'new-operator-id'
            };

            const existingDevice = {
                id: 'device-uuid',
                name: 'Old Name',
                status: DeviceStatus.ACTIVE
            };

            const updatedDevice = {
                ...existingDevice,
                ...updateDeviceDto
            };

            mockDeviceRepository.findOne.mockResolvedValue(existingDevice);
            mockUsersService.findOne.mockResolvedValue({ id: 'new-operator-id' });
            mockDeviceRepository.save.mockResolvedValue(updatedDevice);

            const result = await service.update('device-uuid', updateDeviceDto);

            expect(result).toEqual(updatedDevice);
            expect(mockUsersService.findOne).toHaveBeenCalledWith('new-operator-id');
            expect(mockDeviceRepository.save).toHaveBeenCalledWith(updatedDevice);
        });
    });

    describe('remove', () => {
        it('should remove a device successfully', async () => {
            mockDeviceRepository.delete.mockResolvedValue({ affected: 1 });

            await service.remove('device-uuid');

            expect(mockDeviceRepository.delete).toHaveBeenCalledWith('device-uuid');
        });

        it('should throw NotFoundException if device not found during removal', async () => {
            mockDeviceRepository.delete.mockResolvedValue({ affected: 0 });

            await expect(service.remove('non-existent-id'))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('updateBatchStatus', () => {
        it('should update status for multiple devices', async () => {
            const ids = ['device-1', 'device-2'];
            const status = DeviceStatus.MAINTENANCE;

            mockDeviceRepository.update.mockResolvedValue({ affected: 2 });

            const result = await service.updateBatchStatus(ids, status);

            expect(result).toBe(2);
            expect(mockDeviceRepository.update).toHaveBeenCalledWith(
                { id: expect.any(Object) },
                { status }
            );
        });
    });
}); 