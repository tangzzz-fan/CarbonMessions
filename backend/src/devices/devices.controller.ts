import {
    Controller, Get, Post, Body, Patch, Param, Delete, Query,
    UseGuards, Request, ForbiddenException, NotFoundException,
    BadRequestException
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { QueryDeviceDto } from './dto/query-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../users/constants/permissions.constant';
import { Role } from '../users/enums/role.enum';
import { DeviceStatus } from './enums/device-status.enum';
import { DeviceType } from './enums/device-type.enum';

@ApiTags('设备管理')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@ApiBearerAuth()
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Post()
    @Roles(Role.ADMIN, Role.MANAGER)
    @Permissions(PERMISSIONS.DEVICE_CREATE)
    @ApiOperation({ summary: '创建设备' })
    @ApiResponse({ status: 201, description: '设备创建成功' })
    create(@Body() createDeviceDto: CreateDeviceDto) {
        return this.devicesService.create(createDeviceDto);
    }

    @Get()
    @Permissions(PERMISSIONS.DEVICE_READ)
    @ApiOperation({ summary: '获取所有设备' })
    @ApiResponse({ status: 200, description: '返回设备列表' })
    findAll(@Query() queryParams: QueryDeviceDto) {
        return this.devicesService.findAll(queryParams);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.DEVICE_READ)
    @ApiOperation({ summary: '获取单个设备详情' })
    @ApiResponse({ status: 200, description: '返回设备详情' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    findOne(@Param('id') id: string) {
        return this.devicesService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
    @Permissions(PERMISSIONS.DEVICE_UPDATE)
    @ApiOperation({ summary: '更新设备信息' })
    @ApiResponse({ status: 200, description: '设备更新成功' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
        return this.devicesService.update(id, updateDeviceDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.MANAGER)
    @Permissions(PERMISSIONS.DEVICE_DELETE)
    @ApiOperation({ summary: '删除设备' })
    @ApiResponse({ status: 200, description: '设备删除成功' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    remove(@Param('id') id: string) {
        return this.devicesService.remove(id);
    }

    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
    @Permissions(PERMISSIONS.DEVICE_UPDATE)
    @ApiOperation({ summary: '更新设备状态' })
    @ApiResponse({ status: 200, description: '设备状态更新成功' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: DeviceStatus
    ) {
        // 验证状态是否有效
        if (!Object.values(DeviceStatus).includes(status)) {
            throw new BadRequestException('无效的设备状态');
        }

        const device = await this.devicesService.updateStatus(id, status);
        return {
            message: '设备状态更新成功',
            device: {
                id: device.id,
                name: device.name,
                status: device.status
            }
        };
    }

    @Post('batch/status')
    @Roles(Role.ADMIN, Role.MANAGER)
    @Permissions(PERMISSIONS.DEVICE_UPDATE)
    @ApiOperation({ summary: '批量更新设备状态' })
    @ApiResponse({ status: 200, description: '批量设备状态更新成功' })
    async updateBatchStatus(
        @Body('ids') ids: string[],
        @Body('status') status: DeviceStatus
    ) {
        // 验证IDs和状态
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new BadRequestException('设备ID列表不能为空');
        }

        if (!Object.values(DeviceStatus).includes(status)) {
            throw new BadRequestException('无效的设备状态');
        }

        const affectedCount = await this.devicesService.updateBatchStatus(ids, status);
        return {
            message: '批量设备状态更新成功',
            affectedCount
        };
    }

    @Get('operator/:operatorId')
    @Permissions(PERMISSIONS.DEVICE_READ)
    @ApiOperation({ summary: '获取特定操作员的所有设备' })
    @ApiResponse({ status: 200, description: '返回设备列表' })
    findByOperator(@Param('operatorId') operatorId: string) {
        return this.devicesService.findAll({ operatorId });
    }

    @Get('type/:type')
    @Permissions(PERMISSIONS.DEVICE_READ)
    @ApiOperation({ summary: '获取特定类型的所有设备' })
    @ApiResponse({ status: 200, description: '返回设备列表' })
    findByType(@Param('type') type: string) {
        if (!Object.values(DeviceType).includes(type as DeviceType)) {
            throw new BadRequestException('无效的设备类型');
        }
        return this.devicesService.findAll({ type: type as DeviceType });
    }

    @Get(':id/data')
    @Permissions(PERMISSIONS.DATA_READ)
    @ApiOperation({ summary: '获取设备历史数据' })
    @ApiResponse({ status: 200, description: '返回设备历史数据' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    async getDeviceData(@Param('id') id: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        // 首先确认设备存在
        await this.devicesService.findOne(id);

        // 这里应该调用数据采集服务获取设备数据
        // 由于数据采集模块尚未完全实现，这里返回一个模拟数据
        return {
            deviceId: id,
            message: '设备数据接口尚在开发中',
            dataPoints: [],
            startDate: startDate || 'not specified',
            endDate: endDate || 'not specified'
        };
    }

    @Post(':id/config')
    @Roles(Role.ADMIN, Role.MANAGER)
    @Permissions(PERMISSIONS.DEVICE_UPDATE)
    @ApiOperation({ summary: '配置设备数据采集' })
    @ApiResponse({ status: 200, description: '设备配置更新成功' })
    @ApiResponse({ status: 404, description: '设备不存在' })
    async configureDevice(@Param('id') id: string, @Body() configData: any) {
        // 首先确认设备存在
        const device = await this.devicesService.findOne(id);

        // 这里应该调用配置服务更新设备采集配置
        // 由于配置模块尚未完全实现，这里返回一个成功消息
        return {
            message: '设备配置接口尚在开发中',
            deviceId: id,
            deviceName: device.name,
            config: configData
        };
    }
} 