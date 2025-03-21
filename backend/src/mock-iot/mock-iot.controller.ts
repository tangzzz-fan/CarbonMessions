import { Controller, Get, Post, Body, Logger, Query, Param, Put, Delete, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MockIotService } from './mock-iot.service';
import { SimulationConfig } from './interfaces/simulation-config.interface';
import { ScenarioGeneratorService } from './services/scenario-generator.service';
import { TimePatternGeneratorService } from './services/time-pattern-generator.service';
import { MockDeviceGeneratorService } from './services/mock-device-generator.service';
import { TimeSeriesGeneratorService } from './services/time-series-generator.service';

@ApiTags('模拟IoT数据')
@Controller('mock-iot')
export class MockIotController {
    private readonly logger = new Logger(MockIotController.name);

    constructor(
        private readonly mockIotService: MockIotService,
        private readonly scenarioGenerator: ScenarioGeneratorService,
        private readonly timePatternGenerator: TimePatternGeneratorService,
        private readonly mockDeviceGenerator: MockDeviceGeneratorService,
        private readonly timeSeriesGenerator: TimeSeriesGeneratorService,
    ) { }

    @Get()
    @ApiOperation({ summary: '获取所有模拟设备' })
    @ApiResponse({ status: 200, description: '返回所有可用模拟设备列表' })
    getAllMockDevices() {
        this.logger.log('获取所有模拟设备');
        return this.mockIotService.getAllMockDevices();
    }

    @Post()
    @ApiOperation({ summary: '创建新的模拟设备' })
    @ApiResponse({ status: 201, description: '成功创建新的模拟设备' })
    createMockDevice(@Body() deviceData: any) {
        this.logger.log(`创建新的模拟设备: ${JSON.stringify(deviceData)}`);
        return this.mockIotService.createMockDevice(deviceData);
    }

    @Get(':id')
    @ApiOperation({ summary: '获取指定的模拟设备' })
    @ApiParam({ name: 'id', description: '模拟设备ID' })
    @ApiResponse({ status: 200, description: '返回指定的模拟设备信息' })
    @ApiResponse({ status: 404, description: '未找到指定的模拟设备' })
    getMockDeviceById(@Param('id') id: string) {
        this.logger.log(`获取模拟设备: ${id}`);
        return this.mockIotService.getMockDeviceById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: '更新指定的模拟设备' })
    @ApiParam({ name: 'id', description: '模拟设备ID' })
    @ApiResponse({ status: 200, description: '成功更新指定的模拟设备' })
    @ApiResponse({ status: 404, description: '未找到指定的模拟设备' })
    updateMockDevice(@Param('id') id: string, @Body() updateData: any) {
        this.logger.log(`更新模拟设备 ${id}: ${JSON.stringify(updateData)}`);
        return this.mockIotService.updateMockDevice(id, updateData);
    }

    @Delete(':id')
    @ApiOperation({ summary: '删除指定的模拟设备' })
    @ApiParam({ name: 'id', description: '模拟设备ID' })
    @ApiResponse({ status: 200, description: '成功删除指定的模拟设备' })
    @ApiResponse({ status: 404, description: '未找到指定的模拟设备' })
    deleteMockDevice(@Param('id') id: string) {
        this.logger.log(`删除模拟设备: ${id}`);
        return this.mockIotService.deleteMockDevice(id);
    }

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
    startMockDataSending(
        @Query('interval') intervalStr?: string,
        @Query('devicesPerInterval') devicesPerIntervalStr?: string,
        @Query('randomize') randomizeStr?: string,
    ) {
        const interval = intervalStr ? parseInt(intervalStr, 10) : 5000;
        const devicesPerInterval = devicesPerIntervalStr ? parseInt(devicesPerIntervalStr, 10) : 3;
        const randomize = randomizeStr !== 'false';

        if (isNaN(interval) || isNaN(devicesPerInterval)) {
            throw new BadRequestException('无效的参数: interval和devicesPerInterval必须是有效的数字');
        }

        return this.mockIotService.startMockDataSending(interval, devicesPerInterval, randomize);
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

    @Get()
    async getAllDeviceData() {
        return this.mockIotService.getAllDeviceData();
    }

    @Get(':id')
    async getDeviceDataById(@Param('id') id: string) {
        return this.mockIotService.getDeviceDataById(id);
    }

    @Post()
    async createDeviceData(@Body() deviceData: any) {
        return this.mockIotService.createDeviceData(deviceData);
    }

    @Put(':id')
    async updateDeviceData(@Param('id') id: string, @Body() deviceData: any) {
        return this.mockIotService.updateDeviceData(id, deviceData);
    }

    @Delete(':id')
    async deleteDeviceData(@Param('id') id: string) {
        return this.mockIotService.deleteDeviceData(id);
    }

    @Post('sync-devices')
    @ApiOperation({ summary: '从CSV文件同步设备数据' })
    @ApiResponse({ status: 200, description: '成功从CSV文件同步设备数据' })
    async syncDevicesFromCsv() {
        return this.mockIotService.syncDevicesFromCsv();
    }

    @Post('generate-random')
    @ApiOperation({ summary: '生成并发送随机设备数据' })
    @ApiResponse({ status: 200, description: '成功生成并发送随机设备数据' })
    @ApiQuery({ name: 'count', required: false, description: '生成数据的条数，默认5条' })
    @ApiQuery({ name: 'deviceCount', required: false, description: '使用的设备数量，默认所有设备' })
    @ApiQuery({ name: 'dataTypes', required: false, description: '数据类型(逗号分隔)，默认包含所有类型' })
    @ApiQuery({ name: 'minValue', required: false, description: '最小值，默认0' })
    @ApiQuery({ name: 'maxValue', required: false, description: '最大值，默认100' })
    async generateRandomData(
        @Query('count') count?: number,
        @Query('deviceCount') deviceCount?: number,
        @Query('dataTypes') dataTypes?: string,
        @Query('minValue') minValue?: number,
        @Query('maxValue') maxValue?: number,
    ) {
        return this.mockIotService.generateAndPublishRandomData({
            count: count ? parseInt(count.toString()) : 5,
            deviceCount: deviceCount ? parseInt(deviceCount.toString()) : undefined,
            dataTypes: dataTypes ? dataTypes.split(',') : undefined,
            minValue: minValue !== undefined ? parseFloat(minValue.toString()) : 0,
            maxValue: maxValue !== undefined ? parseFloat(maxValue.toString()) : 100,
        });
    }

    // 场景模拟端点
    @Post('scenario/vehicle-entry')
    @ApiOperation({ summary: '模拟车辆进入园区场景' })
    @ApiResponse({ status: 200, description: '成功模拟车辆进入园区的数据流' })
    @ApiQuery({ name: 'count', required: false, description: '车辆数量，默认1辆' })
    async generateVehicleEntryScenario(@Query('count') count?: number) {
        return this.scenarioGenerator.generateVehicleEntryScenario(
            count ? parseInt(count.toString()) : 1
        );
    }

    @Post('scenario/loading')
    @ApiOperation({ summary: '模拟装卸区作业场景' })
    @ApiResponse({ status: 200, description: '成功模拟装卸区作业的数据流' })
    @ApiQuery({ name: 'duration', required: false, description: '持续时间（分钟），默认60分钟' })
    @ApiQuery({ name: 'interval', required: false, description: '数据生成间隔（分钟），默认5分钟' })
    async generateLoadingScenario(
        @Query('duration') duration?: number,
        @Query('interval') interval?: number
    ) {
        return this.scenarioGenerator.generateLoadingScenario(
            duration ? parseInt(duration.toString()) : 60,
            interval ? parseInt(interval.toString()) : 5
        );
    }

    // 时间模式端点
    @Post('time-pattern/workday-peak')
    @ApiOperation({ summary: '模拟工作日高峰期数据模式' })
    @ApiResponse({ status: 200, description: '成功生成工作日高峰期的设备数据' })
    async generateWorkdayPeakPattern() {
        return this.timePatternGenerator.generateWorkdayPeakPattern();
    }

    @Post('time-pattern/night')
    @ApiOperation({ summary: '模拟夜间数据模式' })
    @ApiResponse({ status: 200, description: '成功生成夜间模式的设备数据' })
    async generateNightPattern() {
        return this.timePatternGenerator.generateNightPattern();
    }

    // 碳排放监测设备端点
    @Post('generate/carbon-devices')
    @ApiOperation({ summary: '生成碳排放监测设备' })
    @ApiResponse({ status: 201, description: '成功生成碳排放监测设备' })
    async generateCarbonDevices() {
        return this.mockIotService.generateCarbonMonitoringDevices();
    }

    // 碳排放场景端点
    @Post('scenario/carbon-peak')
    @ApiOperation({ summary: '模拟碳排放高峰期场景' })
    @ApiResponse({ status: 200, description: '成功模拟碳排放高峰期数据' })
    async generateCarbonPeakScenario() {
        return this.scenarioGenerator.generateCarbonPeakScenario();
    }

    @Post('scenario/carbon-reduction')
    @ApiOperation({ summary: '模拟碳减排措施场景' })
    @ApiResponse({ status: 200, description: '成功模拟碳减排数据' })
    async generateCarbonReductionScenario() {
        return this.scenarioGenerator.generateCarbonReductionScenario();
    }

    // 添加缺失的设备生成端点
    @Post('generate/basic-devices')
    @ApiOperation({ summary: '生成基本模拟设备' })
    @ApiResponse({ status: 201, description: '成功生成基本模拟设备' })
    @ApiQuery({ name: 'count', required: false, description: '要生成的设备数量，默认10个' })
    async generateBasicDevices(@Query('count') countStr?: string) {
        const count = countStr ? parseInt(countStr, 10) : 10;
        if (isNaN(count) || count <= 0) {
            throw new BadRequestException('count参数必须是大于0的数字');
        }

        this.logger.log(`开始生成${count}个基本模拟设备`);
        return this.mockDeviceGenerator.generateBasicDevices(count);
    }

    @Post('generate/logistics-devices')
    @ApiOperation({ summary: '生成物流园区专用设备' })
    @ApiResponse({ status: 201, description: '成功生成物流园区专用设备' })
    async generateLogisticsDevices() {
        this.logger.log('开始生成物流园区专用设备');
        return this.mockDeviceGenerator.generateLogisticsParkDevices();
    }

    // 添加异步装卸场景端点
    @Post('scenario/loading/async')
    @ApiOperation({ summary: '异步模拟装卸区作业场景' })
    @ApiResponse({ status: 202, description: '成功启动异步模拟任务' })
    @ApiQuery({ name: 'duration', required: false, description: '持续时间（分钟），默认60分钟' })
    @ApiQuery({ name: 'interval', required: false, description: '数据生成间隔（分钟），默认5分钟' })
    async startLoadingScenarioAsync(
        @Query('duration') duration?: number,
        @Query('interval') interval?: number
    ) {
        return this.scenarioGenerator.startLoadingScenarioAsync(
            duration ? parseInt(duration.toString()) : 60,
            interval ? parseInt(interval.toString()) : 5
        );
    }

    // 添加任务状态查询端点
    @Get('tasks/:taskId')
    @ApiOperation({ summary: '查询模拟任务状态' })
    @ApiResponse({ status: 200, description: '返回任务状态' })
    getTaskStatus(@Param('taskId') taskId: string) {
        return this.timeSeriesGenerator.getTaskStatus(taskId);
    }

    // 添加查询所有任务的端点
    @Get('tasks')
    @ApiOperation({ summary: '查询所有模拟任务' })
    @ApiResponse({ status: 200, description: '返回所有模拟任务' })
    getAllTasks() {
        return this.timeSeriesGenerator.getAllTasks();
    }

    // 添加时间序列数据生成端点
    @Post('time-series/carbon-emission')
    @ApiOperation({ summary: '生成碳排放时间序列数据' })
    @ApiResponse({ status: 201, description: '成功生成碳排放时间序列数据' })
    @ApiQuery({ name: 'days', required: false, description: '要生成的天数(过去到现在)，默认30天' })
    @ApiQuery({ name: 'interval', required: false, description: '采样间隔(分钟)，默认60分钟' })
    @ApiQuery({ name: 'trend', required: false, description: '趋势系数(-0.5到0.5)，默认0.1' })
    @ApiQuery({ name: 'seasonality', required: false, description: '季节性强度(0到1)，默认0.5' })
    @ApiQuery({ name: 'noise', required: false, description: '噪声强度(0到1)，默认0.2' })
    async generateCarbonEmissionTimeSeries(
        @Query('days') daysStr?: string,
        @Query('interval') intervalStr?: string,
        @Query('trend') trendStr?: string,
        @Query('seasonality') seasonalityStr?: string,
        @Query('noise') noiseStr?: string,
    ) {
        const days = daysStr ? parseInt(daysStr, 10) : 30;
        const interval = intervalStr ? parseInt(intervalStr, 10) : 60;
        const trend = trendStr ? parseFloat(trendStr) : 0.1;
        const seasonality = seasonalityStr ? parseFloat(seasonalityStr) : 0.5;
        const noise = noiseStr ? parseFloat(noiseStr) : 0.2;

        if (isNaN(days) || days <= 0 || days > 365) {
            throw new BadRequestException('days参数必须是1-365之间的数字');
        }

        if (isNaN(interval) || interval <= 0 || interval > 1440) {
            throw new BadRequestException('interval参数必须是1-1440之间的数字');
        }

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        return this.timeSeriesGenerator.generateCarbonEmissionTimeSeries(
            startDate,
            endDate,
            interval,
            { trend, seasonality, noise }
        );
    }

    @Post('time-series/prediction-dataset')
    @ApiOperation({ summary: '生成碳排放预测数据集' })
    @ApiResponse({ status: 201, description: '成功生成碳排放预测数据集' })
    @ApiQuery({ name: 'days', required: false, description: '要生成的天数，默认90天' })
    @ApiQuery({ name: 'interval', required: false, description: '采样间隔(分钟)，默认60分钟' })
    @ApiQuery({ name: 'includeFactors', required: false, description: '是否包含影响因素，默认true' })
    async generatePredictionDataset(
        @Query('days') daysStr?: string,
        @Query('interval') intervalStr?: string,
        @Query('includeFactors') includeFactorsStr?: string,
    ) {
        const days = daysStr ? parseInt(daysStr, 10) : 90;
        const interval = intervalStr ? parseInt(intervalStr, 10) : 60;
        const includeFactors = includeFactorsStr !== 'false';

        if (isNaN(days) || days <= 0 || days > 365) {
            throw new BadRequestException('days参数必须是1-365之间的数字');
        }

        if (isNaN(interval) || interval <= 0 || interval > 1440) {
            throw new BadRequestException('interval参数必须是1-1440之间的数字');
        }

        return this.timeSeriesGenerator.generatePredictionDataset(days, interval, includeFactors);
    }

    // 添加新端点
    @Post('time-series/carbon-emission/async')
    @ApiOperation({ summary: '异步生成碳排放时间序列数据' })
    @ApiResponse({ status: 201, description: '开始异步生成碳排放时间序列数据' })
    @ApiQuery({ name: 'days', required: false, description: '要生成的天数(过去到现在)，默认30天' })
    @ApiQuery({ name: 'interval', required: false, description: '采样间隔(分钟)，默认60分钟' })
    @ApiQuery({ name: 'trend', required: false, description: '趋势系数(-0.5到0.5)，默认0.1' })
    @ApiQuery({ name: 'seasonality', required: false, description: '季节性强度(0到1)，默认0.5' })
    @ApiQuery({ name: 'noise', required: false, description: '噪声强度(0到1)，默认0.2' })
    async generateCarbonEmissionTimeSeriesAsync(
        @Query('days') daysStr?: string,
        @Query('interval') intervalStr?: string,
        @Query('trend') trendStr?: string,
        @Query('seasonality') seasonalityStr?: string,
        @Query('noise') noiseStr?: string,
    ) {
        const days = daysStr ? parseInt(daysStr, 10) : 30;
        const interval = intervalStr ? parseInt(intervalStr, 10) : 60;
        const trend = trendStr ? parseFloat(trendStr) : 0.1;
        const seasonality = seasonalityStr ? parseFloat(seasonalityStr) : 0.5;
        const noise = noiseStr ? parseFloat(noiseStr) : 0.2;

        if (isNaN(days) || days <= 0 || days > 365) {
            throw new BadRequestException('days参数必须是1-365之间的数字');
        }

        if (isNaN(interval) || interval <= 0 || interval > 1440) {
            throw new BadRequestException('interval参数必须是1-1440之间的数字');
        }

        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        return this.timeSeriesGenerator.generateCarbonEmissionTimeSeriesAsync(
            startDate,
            endDate,
            interval,
            { trend, seasonality, noise }
        );
    }
} 