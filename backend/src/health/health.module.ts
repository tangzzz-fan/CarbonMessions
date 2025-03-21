import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DbTestController } from './db-test.controller';
import { DbCheckController } from './db-check.controller';
import { DbInitController } from './db-init.controller';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockIotModule } from '../mock-iot/mock-iot.module';

@Module({
    imports: [
        TerminusModule,
        TypeOrmModule.forFeature([]),
        MockIotModule,
    ],
    controllers: [
        HealthController,
        DbTestController,
        DbCheckController,
        DbInitController,
    ],
})
export class HealthModule { } 