import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../users/roles/roles.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Device]),
        UsersModule,
        RolesModule
    ],
    controllers: [DevicesController],
    providers: [DevicesService],
    exports: [DevicesService]
})
export class DevicesModule { } 