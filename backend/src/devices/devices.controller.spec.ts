import { Test, TestingModule } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeviceStatus } from './enums/device-status.enum';
import { DeviceType } from './enums/device-type.enum';
import { EnergyType } from './enums/energy-type.enum';

describe('DevicesController', () => {
    let controller: DevicesController;
    let service: DevicesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DevicesController],
            providers: [
                {
                    provide: DevicesService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                        remove: jest.fn(),
                        updateStatus: jest.fn(),
                        updateBatchStatus: jest.fn(),
                        getBatchDevices: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<DevicesController>(DevicesController);
        service = module.get<DevicesService>(DevicesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create a device successfully', async () => {
            const createDeviceDto = {
                name: 'Test Device',
                type: DeviceType.TRUCK,
                status: DeviceStatus.ACTIVE,
                energyType: EnergyType.DIESEL
            };

            const mockDevice = {
                id: 'device-uuid',
                ...createDeviceDto,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            jest.spyOn(service, 'create').mockResolvedValue(mockDevice as any);

            const result = await controller.create(createDeviceDto);

            expect(result).toEqual(mockDevice);
            expect(service.create).toHaveBeenCalledWith(createDeviceDto);
        });
    });

    describe('findAll', () => {
        it('should return array of devices', async () => {
            const mockDevices = [
                {
                    id: 'device-1',
                    name: 'Device 1',
                    type: DeviceType.TRUCK
                },
                {
                    id: 'device-2',
                    name: 'Device 2',
                    type: DeviceType.FORKLIFT
                }
            ];

            const queryParams = { type: DeviceType.TRUCK };

            jest.spyOn(service, 'findAll').mockResolvedValue(mockDevices as any);

            const result = await controller.findAll(queryParams);

            expect(result).toEqual(mockDevices);
            expect(service.findAll).toHaveBeenCalledWith(queryParams);
        });
    });

    describe('findOne', () => {
        it('should return a device by id', async () => {
            const mockUser = { roles: ['admin'] };
            const mockDevice = {
                id: 'device-uuid',
                name: 'Test Device',
                type: DeviceType.TRUCK
            };

            jest.spyOn(service, 'findOne').mockResolvedValue(mockDevice as any);

            const result = await controller.findOne('device-uuid', { user: mockUser });

            expect(result).toEqual(mockDevice);
            expect(service.findOne).toHaveBeenCalledWith('device-uuid', { user: mockUser });
        });

        it('should throw NotFoundException for non-existent device', async () => {
            const mockUser = { roles: ['admin'] };
            jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

            await expect(controller.findOne('non-existent-id', { user: mockUser }))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a device', async () => {
            const updateDeviceDto = {
                name: 'Updated Device',
                status: DeviceStatus.MAINTENANCE
            };

            const mockDevice = {
                id: 'device-uuid',
                name: 'Updated Device',
                status: DeviceStatus.MAINTENANCE
            };

            jest.spyOn(service, 'update').mockResolvedValue(mockDevice as any);

            const result = await controller.update('device-uuid', updateDeviceDto);

            expect(result).toEqual(mockDevice);
            expect(service.update).toHaveBeenCalledWith('device-uuid', updateDeviceDto);
        });
    });

    describe('remove', () => {
        it('should remove a device', async () => {
            jest.spyOn(service, 'remove').mockResolvedValue(undefined);

            await controller.remove('device-uuid');

            expect(service.remove).toHaveBeenCalledWith('device-uuid');
        });

        it('should throw NotFoundException if device not found', async () => {
            jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException());

            await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateStatus', () => {
        it('should update device status', async () => {
            const mockDevice = {
                id: 'device-uuid',
                name: 'Test Device',
                status: DeviceStatus.ACTIVE,
            };

            jest.spyOn(service, 'updateStatus').mockResolvedValue(mockDevice as any);

            const result = await controller.updateStatus('device-uuid', DeviceStatus.ACTIVE);

            expect(result).toEqual({
                message: '设备状态更新成功',
                device: {
                    id: mockDevice.id,
                    name: mockDevice.name,
                    status: mockDevice.status
                }
            });
            expect(service.updateStatus).toHaveBeenCalledWith('device-uuid', DeviceStatus.ACTIVE);
        });

        it('should throw BadRequestException for invalid status', async () => {
            await expect(controller.updateStatus('device-uuid', 'invalid-status' as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('updateBatchStatus', () => {
        it('should update status for multiple devices', async () => {
            const ids = ['device-1', 'device-2'];
            const status = DeviceStatus.MAINTENANCE;

            jest.spyOn(service, 'updateBatchStatus').mockResolvedValue(2);

            const result = await controller.updateBatchStatus(ids, status);

            expect(result).toEqual({
                message: '批量设备状态更新成功',
                affectedCount: 2
            });
            expect(service.updateBatchStatus).toHaveBeenCalledWith(ids, status);
        });

        it('should throw BadRequestException when empty ids array', async () => {
            await expect(controller.updateBatchStatus([], DeviceStatus.ACTIVE))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when invalid status', async () => {
            await expect(controller.updateBatchStatus(['device-1'], 'invalid-status' as any))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('findByOperator', () => {
        it('should return devices for a specific operator', async () => {
            const operatorId = 'operator-id';
            const mockDevices = [
                { id: 'device-1', name: 'Device 1', operatorId },
                { id: 'device-2', name: 'Device 2', operatorId }
            ];

            jest.spyOn(service, 'findAll').mockResolvedValue(mockDevices as any);

            const result = await controller.findByOperator(operatorId);

            expect(result).toEqual(mockDevices);
            expect(service.findAll).toHaveBeenCalledWith({ operatorId });
        });
    });

    describe('findByType', () => {
        it('should return devices of a specific type', async () => {
            const type = DeviceType.TRUCK;
            const mockDevices = [
                { id: 'device-1', name: 'Device 1', type },
                { id: 'device-2', name: 'Device 2', type }
            ];

            jest.spyOn(service, 'findAll').mockResolvedValue(mockDevices as any);

            const result = await controller.findByType(type);

            expect(result).toEqual(mockDevices);
            expect(service.findAll).toHaveBeenCalledWith({ type });
        });

        it('should throw BadRequestException for invalid type', () => {
            // 不用await，因为我们直接同步调用方法测试异常
            expect(() => {
                controller.findByType('invalid-type' as any);
            }).toThrow(BadRequestException);
        });
    });
}); 