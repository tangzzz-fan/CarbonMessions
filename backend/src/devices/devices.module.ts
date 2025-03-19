import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Device]),
        UsersModule
    ],
    controllers: [DevicesController],
    providers: [DevicesService],
    exports: [DevicesService]
})
export class DevicesModule { } 