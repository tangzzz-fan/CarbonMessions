import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
    constructor(private configService: ConfigService) { }

    @Get()
    @ApiOperation({ summary: '健康检查' })
    @ApiResponse({ status: 200, description: '服务正常运行' })
    check() {
        return {
            status: 'ok',
            timestamp: new Date(),
            environment: this.configService.get('NODE_ENV'),
            version: '0.1.0',
        };
    }

    @Get('config')
    @ApiOperation({ summary: '配置检查' })
    @ApiResponse({ status: 200, description: '配置信息' })
    checkConfig() {
        // 返回非敏感配置信息，用于调试
        return {
            nodeEnv: this.configService.get('NODE_ENV'),
            port: this.configService.get('PORT'),
            dbHost: this.configService.get('DB_HOST'),
            dbPort: this.configService.get('DB_PORT'),
            dbName: this.configService.get('DB_DATABASE'),
            jwtExpiresIn: this.configService.get('JWT_EXPIRES_IN'),
            // 注意：不要返回敏感信息如密码和密钥
        };
    }
} 