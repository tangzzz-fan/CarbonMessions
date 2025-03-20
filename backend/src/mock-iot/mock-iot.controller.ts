import { Controller, Get, Post, Body, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MockIotService } from './mock-iot.service';
import { SimulationConfig } from './interfaces/simulation-config.interface';

@ApiTags('模拟IoT数据')
@Controller('mock-iot')
export class MockIotController {
    private readonly logger = new Logger(MockIotController.name);

    constructor(private readonly mockIotService: MockIotService) { }

    @Get('status')
    @ApiOperation({ summary: '获取模拟数据状态' })
    @ApiResponse({ status: 200, description: '返回模拟数据的状态信息' })
    getStatus() {
        return this.mockIotService.getSimulationStatus();
    }

    @Post('reload')
    @ApiOperation({ summary: '重新加载模拟数据' })
    @ApiResponse({ status: 200, description: '成功重新加载CSV数据' })
    async reloadMockData() {
        await this.mockIotService.loadMockData();
        return this.mockIotService.getMockDataStatus();
    }

    @Post('start')
    @ApiOperation({ summary: '开始持续模拟数据上报' })
    @ApiResponse({ status: 200, description: '成功启动模拟数据上报' })
    @ApiQuery({ name: 'interval', required: false, description: '发送间隔(毫秒)，默认5000ms' })
    @ApiQuery({ name: 'devicesPerInterval', required: false, description: '每次发送的设备数量，默认3个' })
    @ApiQuery({ name: 'randomize', required: false, description: '是否随机选择数据，默认true' })
    startSimulation(
        @Query('interval') interval?: number,
        @Query('devicesPerInterval') devicesPerInterval?: number,
        @Query('randomize') randomize?: boolean | string
    ) {
        const config: Partial<SimulationConfig> = {};

        if (interval !== undefined) {
            config.interval = parseInt(interval.toString());
        }

        if (devicesPerInterval !== undefined) {
            config.devicesPerInterval = parseInt(devicesPerInterval.toString());
        }

        if (randomize !== undefined) {
            if (typeof randomize === 'string') {
                config.randomize = randomize === 'true';
            } else {
                config.randomize = randomize;
            }
        }

        return this.mockIotService.startSimulation(config);
    }

    @Post('stop')
    @ApiOperation({ summary: '停止模拟数据上报' })
    @ApiResponse({ status: 200, description: '成功停止模拟数据上报' })
    stopSimulation() {
        return this.mockIotService.stopSimulation();
    }

    @Post('publish')
    @ApiOperation({ summary: '一次性发布模拟设备数据' })
    @ApiResponse({ status: 200, description: '成功发布模拟数据' })
    @ApiQuery({ name: 'count', required: false, description: '发布数据的条数，默认10条' })
    @ApiQuery({ name: 'interval', required: false, description: '发布间隔(毫秒)，默认1000ms' })
    async publishMockData(
        @Query('count') count?: number,
        @Query('interval') interval?: number
    ) {
        return this.mockIotService.publishMockData(
            count ? parseInt(count.toString()) : 10,
            interval ? parseInt(interval.toString()) : 1000
        );
    }
} 