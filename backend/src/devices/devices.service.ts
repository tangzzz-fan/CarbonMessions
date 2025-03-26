import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Device } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { DeviceType } from './enums/device-type.enum';
import { Logger } from '@nestjs/common';

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

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

    /**
     * 查找所有设备
     * @param user 当前用户
     * @returns 设备列表
     */
    async findAll(user?: any): Promise<Device[]> {
        try {
            // 创建查询构建器
            let queryBuilder = this.devicesRepository.createQueryBuilder('device');

            // 记录查询前的日志
            this.logger.log(`开始查询设备列表，用户角色: ${user?.roles || user?.role || '未知'}`);

            // 如果不是管理员或管理者，则应用权限过滤
            if (user && !(user.roles?.includes(Role.ADMIN) || user.role === Role.ADMIN ||
                user.roles?.includes(Role.MANAGER) || user.role === Role.MANAGER)) {
                queryBuilder = queryBuilder.where('device.isActive = :isActive', { isActive: true });
                this.logger.log('应用权限过滤：仅查询活跃设备');
            }

            // 执行查询
            const devices = await queryBuilder.getMany();

            // 记录查询结果
            this.logger.log(`查询到 ${devices.length} 条设备记录`);

            // 如果没有查询到数据，记录一条警告
            if (devices.length === 0) {
                this.logger.warn('设备查询返回空结果');
            }

            return devices;
        } catch (error) {
            this.logger.error(`查询设备列表失败: ${error.message}`);
            throw new InternalServerErrorException('查询设备列表失败');
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

        // 当没有提供user或者user没有roles属性时，直接返回设备信息
        if (!user || !user.roles) {
            return device;
        }

        if (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.MANAGER)) {
            // 管理员和管理者可以看到设备的所有信息
            return device;
        } else if (user.roles.includes(Role.USER)) {
            // 用户只能看到自己的设备
            if (device.operatorId !== user.id) {
                throw new ForbiddenException('您没有权限访问此设备');
            }
            // 返回完整设备但不包括敏感信息
            return device;
        }

        // 访客只能看到基本信息
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
        try {
            // 如果提供了操作员ID，验证该用户存在
            if (updateDeviceDto.operatorId) {
                await this.usersService.findOne(updateDeviceDto.operatorId);
            }

            // 直接查询设备是否存在，不进行权限检查
            const device = await this.devicesRepository.findOne({
                where: { id },
                relations: ['operator']
            });

            if (!device) {
                throw new NotFoundException(`ID为${id}的设备不存在`);
            }

            // 更新设备
            const updatedDevice = Object.assign(device, updateDeviceDto);
            return this.devicesRepository.save(updatedDevice);
        } catch (error) {
            this.logger.error(`更新设备失败: ${error.message}`);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`更新设备失败: ${error.message}`);
        }
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

    /**
     * 修复设备类型枚举值
     * @returns 修复结果
     */
    async fixDeviceTypeEnum(): Promise<{ fixed: number, failed: number }> {
        let fixed = 0;
        let failed = 0;

        // 获取所有设备记录
        const devices = await this.devicesRepository.find();
        this.logger.log(`开始修复设备类型枚举值，共有 ${devices.length} 条记录需要检查`);

        for (const device of devices) {
            try {
                // 检查设备类型是否是有效的枚举值
                const isValidType = Object.values(DeviceType).includes(device.type);

                if (!isValidType) {
                    this.logger.warn(`设备 ${device.id} (${device.name}) 具有无效的类型值: ${device.type}`);

                    // 尝试修复类型值（假设是大小写问题）
                    let fixedType: DeviceType | undefined;

                    // 尝试将类型转换为大写并查找匹配的枚举值
                    const upperCaseType = device.type?.toString().toUpperCase();
                    if (upperCaseType && Object.values(DeviceType).includes(upperCaseType as DeviceType)) {
                        fixedType = upperCaseType as DeviceType;
                    }

                    // 如果找到有效的枚举值，更新设备记录
                    if (fixedType) {
                        device.type = fixedType;
                        await this.devicesRepository.save(device);
                        this.logger.log(`修复了设备 ${device.id} 的类型值为 ${fixedType}`);
                        fixed++;
                    } else {
                        // 如果无法修复，将设备类型设置为 OTHER
                        device.type = DeviceType.OTHER;
                        await this.devicesRepository.save(device);
                        this.logger.warn(`无法确定设备 ${device.id} 的正确类型，已设置为 OTHER`);
                        fixed++;
                    }
                }
            } catch (error) {
                this.logger.error(`修复设备 ${device.id} 的类型值失败: ${error.message}`);
                failed++;
            }
        }

        return { fixed, failed };
    }
}