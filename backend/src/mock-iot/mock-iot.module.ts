import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MockIotController } from './mock-iot.controller';
import { MockIotService } from './mock-iot.service';
import { DataCollectionModule } from '../data-collection/data-collection.module';
import { DevicesModule } from '../devices/devices.module';
import { MockDeviceGeneratorService } from './services/mock-device-generator.service';
import { ScenarioGeneratorService } from './services/scenario-generator.service';
import { TimePatternGeneratorService } from './services/time-pattern-generator.service';
import { TimeSeriesGeneratorService } from './services/time-series-generator.service';

@Module({
    imports: [
        ConfigModule,
        DataCollectionModule, // 导入数据采集模块，以使用DataCollectionService
        DevicesModule, // 导入设备模块，以查询设备信息
    ],
    controllers: [MockIotController],
    providers: [
        MockIotService,
        MockDeviceGeneratorService,
        ScenarioGeneratorService,
        TimePatternGeneratorService,
        TimeSeriesGeneratorService,
    ],
    exports: [
        MockIotService,
        MockDeviceGeneratorService,
    ],
})
export class MockIotModule { } 