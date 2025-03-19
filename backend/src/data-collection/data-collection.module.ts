import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DataCollectionController } from './data-collection.controller';
import { DataCollectionService } from './data-collection.service';
import { DataProcessingService } from './data-processing.service';
import { QueueService } from './queue/queue.service';
import { DeviceData } from './entities/device-data.entity';
import { DevicesModule } from '../devices/devices.module';
import { RolesModule } from '../users/roles/roles.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeviceData]),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
        ConfigModule,
        DevicesModule,
        RolesModule,
    ],
    controllers: [DataCollectionController],
    providers: [DataCollectionService, DataProcessingService, QueueService],
    exports: [DataCollectionService, DataProcessingService, QueueService],
})
export class DataCollectionModule { }