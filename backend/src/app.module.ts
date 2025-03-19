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
    ],
})

export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // 对所有需要 JWT 验证的路由应用中间件
        consumer
            .apply(TokenRefreshMiddleware)
            .forRoutes('*'); // 或者指定特定路由
    }
} 