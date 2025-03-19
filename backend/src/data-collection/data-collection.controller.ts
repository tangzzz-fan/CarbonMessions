import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
    ValidationPipe,
    ParseUUIDPipe,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { DataCollectionService } from './data-collection.service';
import { CreateDeviceDataDto } from './dto/create-device-data.dto';
import { QueryDeviceDataDto } from './dto/query-device-data.dto';
import { DeviceData } from './entities/device-data.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('data-collection')
@Controller('data-collection')
export class DataCollectionController {
    private readonly logger = new Logger(DataCollectionController.name);

    constructor(private readonly dataCollectionService: DataCollectionService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建设备数据记录' })
    @ApiResponse({ status: 201, description: '数据记录创建成功', type: DeviceData })
    async create(@Body() createDeviceDataDto: CreateDeviceDataDto): Promise<DeviceData> {
        this.logger.log(`Creating device data: ${JSON.stringify(createDeviceDataDto)}`);
        return this.dataCollectionService.create(createDeviceDataDto);
    }

    @Post('batch')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.OPERATOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: '批量创建设备数据记录' })
    @ApiResponse({ status: 201, description: '数据记录批量创建成功', type: [DeviceData] })
    async createBatch(@Body() createDeviceDataDtos: CreateDeviceDataDto[]): Promise<DeviceData[]> {
        this.logger.log(`Creating batch device data with ${createDeviceDataDtos.length} items`);
        return this.dataCollectionService.createBatch(createDeviceDataDtos);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '查询设备数据' })
    @ApiResponse({ status: 200, description: '返回设备数据列表', type: [DeviceData] })
    async findAll(@Query(new ValidationPipe({ transform: true })) queryParams: QueryDeviceDataDto): Promise<DeviceData[]> {
        this.logger.log(`Querying device data with params: ${JSON.stringify(queryParams)}`);
        return this.dataCollectionService.findAll(queryParams);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '通过ID获取设备数据' })
    @ApiResponse({ status: 200, description: '返回设备数据', type: DeviceData })
    @ApiResponse({ status: 404, description: '设备数据未找到' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DeviceData> {
        this.logger.log(`Finding device data with id: ${id}`);
        return this.dataCollectionService.findOne(id);
    }

    @Get('device/:deviceId/latest')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取设备最新数据' })
    @ApiResponse({ status: 200, description: '返回设备最新数据', type: DeviceData })
    @ApiResponse({ status: 404, description: '设备数据未找到' })
    async findLatest(
        @Param('deviceId', ParseUUIDPipe) deviceId: string,
        @Query('type') type?: string,
    ): Promise<DeviceData> {
        this.logger.log(`Finding latest data for device: ${deviceId}, type: ${type || 'all'}`);
        return this.dataCollectionService.findLatestByDeviceId(deviceId, type);
    }

    // 模拟设备上传数据的端点（不需要认证，供设备使用）
    @Post('device-upload')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '设备数据上传端点（供设备使用）' })
    @ApiResponse({ status: 200, description: '数据上传成功', type: DeviceData })
    async deviceUpload(@Body() createDeviceDataDto: CreateDeviceDataDto): Promise<DeviceData> {
        this.logger.log(`Device uploading data: ${JSON.stringify(createDeviceDataDto)}`);
        return this.dataCollectionService.create(createDeviceDataDto);
    }

    // 管理端点
    @Post('cleanup')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: '清理旧数据（仅管理员）' })
    @ApiResponse({ status: 200, description: '返回删除的记录数' })
    async cleanupOldData(@Body('beforeDate') beforeDate: Date): Promise<{ deletedCount: number }> {
        this.logger.log(`Cleaning up old data before: ${beforeDate}`);
        const deletedCount = await this.dataCollectionService.cleanupOldData(beforeDate);
        return { deletedCount };
    }
} 