import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { DevicesModule } from './devices/devices.module';
import { DataCollectionModule } from './data-collection/data-collection.module';
import { PredictionModule } from './prediction/prediction.module';
import { EmissionModule } from './emission/emission.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { TokenRefreshMiddleware } from './auth/middleware/token-refresh.middleware';
import { MockIotModule } from './mock-iot/mock-iot.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ApiKeyMiddleware } from './auth/middleware/api-key.middleware';

@Module({
    imports: [
        // 配置模块
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
        }),

        // 数据库连接
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DB_HOST', 'localhost'),
                port: configService.get<number>('DB_PORT', 5432),
                username: configService.get('DB_USERNAME', 'postgres'),
                password: configService.get('DB_PASSWORD', 'postgres'),
                database: configService.get('DB_DATABASE', 'carbon_emission'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: configService.get('NODE_ENV') !== 'production',
                logging: configService.get('NODE_ENV') !== 'production',
            }),
        }),

        // 功能模块
        AuthModule,
        UsersModule,
        DevicesModule,
        DataCollectionModule,
        PredictionModule,
        EmissionModule,
        HealthModule,

        // 仅在开发环境中导入模拟IoT模块
        ...(process.env.NODE_ENV !== 'production' ? [MockIotModule] : []),
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // 添加日志中间件和API密钥中间件
        consumer
            .apply(LoggerMiddleware, TokenRefreshMiddleware, ApiKeyMiddleware)
            .forRoutes('*');
    }
}