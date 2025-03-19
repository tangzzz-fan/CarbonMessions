import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DbTestController } from './db-test.controller';
import { DbCheckController } from './db-check.controller';
import { DbInitController } from './db-init.controller';

@Module({
    controllers: [
        HealthController,
        DbTestController,
        DbCheckController,
        DbInitController,
    ],
})
export class HealthModule { } 