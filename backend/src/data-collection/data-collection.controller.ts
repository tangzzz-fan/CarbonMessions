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
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { DataCollectionService } from './data-collection.service';
import { CreateDeviceDataDto } from './dto/create-device-data.dto';
import { QueryDeviceDataDto } from './dto/query-device-data.dto';
import { DeviceData } from './entities/device-data.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiKeyAuth } from '../auth/decorators/api-key-auth.decorator';
import { Role } from '../users/enums/role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('数据采集')
@Controller('data-collection')
export class DataCollectionController {
    private readonly logger = new Logger(DataCollectionController.name);

    constructor(
        private readonly dataCollectionService: DataCollectionService,
        private readonly configService: ConfigService
    ) { }

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
    @ApiBearerAuth()
    @ApiOperation({ summary: '查询设备数据' })
    @ApiResponse({ status: 200, description: '返回设备数据列表', type: [DeviceData] })
    async findAll(@Query(new ValidationPipe({ transform: true })) queryParams: QueryDeviceDataDto): Promise<DeviceData[]> {
        this.logger.log(`Querying device data with params: ${JSON.stringify(queryParams)}`);
        return this.dataCollectionService.findAll(queryParams);
    }

    @Get('historical-data')
    @UseGuards(ApiKeyAuthGuard)
    @ApiKeyAuth()
    @ApiOperation({ summary: '获取设备历史数据', description: '根据设备ID、数据类型和时间范围获取历史数据（需要API密钥认证）' })
    @ApiQuery({ name: 'deviceId', required: false, description: '设备ID' })
    @ApiQuery({ name: 'type', required: false, description: '数据类型' })
    @ApiQuery({ name: 'hours', required: false, description: '查询的小时数' })
    @ApiQuery({ name: 'page', required: false, description: '页码' })
    @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
    @ApiQuery({ name: 'x-api-key', required: true, description: 'API密钥，通过请求头传递' })
    @ApiResponse({ status: 200, description: '返回历史数据列表' })
    @ApiResponse({ status: 401, description: 'API密钥无效或未提供' })
    async getHistoricalData(
        @Query('deviceId') deviceId?: string,
        @Query('type') type?: string,
        @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours?: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
        @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    ) {
        this.logger.log(`Fetching historical data with API key auth: deviceId=${deviceId}, type=${type}, hours=${hours}`);
        return this.dataCollectionService.getHistoricalData(deviceId, type, hours, page, limit);
    }

    @Get('device/:deviceId/latest')
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

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '通过ID获取设备数据' })
    @ApiResponse({ status: 200, description: '返回设备数据', type: DeviceData })
    @ApiResponse({ status: 404, description: '设备数据未找到' })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DeviceData> {
        this.logger.log(`Finding device data with id: ${id}`);
        return this.dataCollectionService.findOne(id);
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