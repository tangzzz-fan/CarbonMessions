import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Device])],
    controllers: [],
    providers: [],
    exports: [],
})
export class DevicesModule { } 