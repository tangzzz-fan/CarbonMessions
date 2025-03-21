import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { DeviceType } from './enums/device-type.enum';

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

    async findAll(user?: any): Promise<Device[]> {
        if (user?.roles?.includes(Role.ADMIN)) {
            // 管理员可以看到所有设备的完整信息
            return this.devicesRepository.find();
        } else if (user?.roles?.includes(Role.USER)) {
            // 普通用户只能看到自己的设备，且不包括某些敏感字段
            return this.devicesRepository.find({
                where: { operatorId: user.id }
            });
        } else {
            // 访客或未定义用户只能看到设备的基本公开信息
            return this.devicesRepository.find({
                where: { visibility: 'public' }
            });
        }
    }

    async findOne(id: string, user: any): Promise<Device> {
        const device = await this.devicesRepository.findOne({
            where: { id },
            relations: ['operator']
        });

        if (!device) {
            throw new NotFoundException(`ID为${id}的设备不存在`);
        }

        if (user && user.roles) {
            if (user.roles.includes(Role.ADMIN)) {
                // 管理员可以看到设备的所有信息
                return device;
            } else if (user.roles.includes(Role.USER)) {
                // 用户只能看到自己的设备
                if (device.operatorId !== user.id) {
                    throw new ForbiddenException('您没有权限访问此设备');
                }
                // 返回完整设备但不包括敏感信息
                return device;
            }
        }

        // 访客只能看到基本信息
        // 我们需要创建一个符合Device类型的对象
        const { id: deviceId, name, location, status, type, model, manufacturer, description } = device;
        return this.devicesRepository.create({
            id: deviceId,
            name,
            location,
            status,
            type,
            model,
            manufacturer,
            description
        });
    }

    async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
        // 如果提供了操作员ID，验证该用户存在
        if (updateDeviceDto.operatorId) {
            await this.usersService.findOne(updateDeviceDto.operatorId);
        }

        // 检查设备是否存在
        const device = await this.findOne(id, { roles: [Role.ADMIN] }); // 以管理员身份查询

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
        const device = await this.findOne(id, { roles: [Role.ADMIN] }); // 以管理员身份查询
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

    async removeAll() {
        return this.devicesRepository.delete({});
    }

    async assignToOperator(deviceName: string, operatorUsername: string) {
        const device = await this.devicesRepository.findOne({ where: { name: deviceName } });
        if (!device) {
            throw new NotFoundException(`Device ${deviceName} not found`);
        }

        return this.devicesRepository.update(device.id, {
            operatorId: operatorUsername
        });
    }

    async updateDeviceVisibility(deviceName: string, visibility: 'public' | 'private') {
        const device = await this.devicesRepository.findOne({ where: { name: deviceName } });
        if (!device) {
            throw new NotFoundException(`Device ${deviceName} not found`);
        }

        return this.devicesRepository.update(device.id, {
            visibility
        });
    }

    async deleteAll(): Promise<void> {
        await this.devicesRepository.delete({});
        return;
    }

    findSensitiveData(id: string) {
        const device = this.devicesRepository.findOne({
            where: { id },
            // 仅选择设备中已存在的字段
            select: ['id', 'model', 'manufacturer', 'description', 'createdAt', 'updatedAt']
        });
        if (!device) return null;

        // 返回包含敏感信息的设备数据
        return device;
    }

    /**
     * 根据设备ID查找设备
     * @param deviceId 设备ID标识符
     * @returns 设备实体或null
     */
    async findByDeviceId(deviceId: string): Promise<Device | null> {
        if (!deviceId) return null;

        return this.devicesRepository.findOne({
            where: { deviceId }
        });
    }

    /**
     * 根据设备类型查找设备
     * @param type 设备类型
     * @returns 符合类型的设备列表
     */
    async findByType(type: DeviceType): Promise<Device[]> {
        return this.devicesRepository.find({
            where: { type }
        });
    }
}