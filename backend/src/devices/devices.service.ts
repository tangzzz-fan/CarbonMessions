import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private devicesRepository: Repository<Device>,
        private usersService: UsersService
    ) { }

    async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
        // 如果提供了操作员ID，验证该用户存在
        if (createDeviceDto.operatorId) {
            await this.usersService.findOne(createDeviceDto.operatorId);
        }

        const device = this.devicesRepository.create(createDeviceDto);
        return this.devicesRepository.save(device);
    }

    async findAll(queryParams: QueryDeviceDto): Promise<Device[]> {
        const queryBuilder = this.devicesRepository.createQueryBuilder('device');

        // 根据查询参数添加条件
        if (queryParams.name) {
            queryBuilder.andWhere('device.name LIKE :name', { name: `%${queryParams.name}%` });
        }

        if (queryParams.type) {
            queryBuilder.andWhere('device.type = :type', { type: queryParams.type });
        }

        if (queryParams.status) {
            queryBuilder.andWhere('device.status = :status', { status: queryParams.status });
        }

        if (queryParams.energyType) {
            queryBuilder.andWhere('device.energyType = :energyType', { energyType: queryParams.energyType });
        }

        if (queryParams.location) {
            queryBuilder.andWhere('device.location LIKE :location', { location: `%${queryParams.location}%` });
        }

        if (queryParams.operatorId) {
            queryBuilder.andWhere('device.operatorId = :operatorId', { operatorId: queryParams.operatorId });
        }

        if (queryParams.isActive !== undefined) {
            queryBuilder.andWhere('device.isActive = :isActive', { isActive: queryParams.isActive });
        }

        // 关联查询操作员信息
        queryBuilder.leftJoinAndSelect('device.operator', 'user');

        return queryBuilder.getMany();
    }

    async findOne(id: string): Promise<Device> {
        const device = await this.devicesRepository.findOne({
            where: { id },
            relations: ['operator']
        });

        if (!device) {
            throw new NotFoundException(`ID为${id}的设备不存在`);
        }

        return device;
    }

    async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
        // 如果提供了操作员ID，验证该用户存在
        if (updateDeviceDto.operatorId) {
            await this.usersService.findOne(updateDeviceDto.operatorId);
        }

        // 检查设备是否存在
        const device = await this.findOne(id);

        // 更新设备
        const updatedDevice = Object.assign(device, updateDeviceDto);
        return this.devicesRepository.save(updatedDevice);
    }

    async remove(id: string): Promise<void> {
        const result = await this.devicesRepository.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException(`ID为${id}的设备不存在`);
        }
    }

    async updateStatus(id: string, status: string): Promise<Device> {
        const device = await this.findOne(id);
        device.status = status as any;
        return this.devicesRepository.save(device);
    }

    async getBatchDevices(ids: string[]): Promise<Device[]> {
        if (!ids || ids.length === 0) {
            return [];
        }

        return this.devicesRepository.find({
            where: { id: In(ids) },
            relations: ['operator']
        });
    }

    async updateBatchStatus(ids: string[], status: string): Promise<number> {
        const result = await this.devicesRepository.update(
            { id: In(ids) },
            { status: status as any }
        );

        return result.affected || 0;
    }
} 