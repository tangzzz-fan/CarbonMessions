import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('数据库测试')
@Controller('db-test')
export class DbTestController {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    @Get()
    @ApiOperation({ summary: '测试数据库连接' })
    @ApiResponse({ status: 200, description: '数据库连接成功' })
    @ApiResponse({ status: 500, description: '数据库连接失败' })
    async testConnection() {
        try {
            // 尝试执行简单查询
            const result = await this.dataSource.query('SELECT NOW()');
            return {
                status: 'ok',
                message: '数据库连接成功',
                timestamp: result[0].now,
            };
        } catch (error) {
            return {
                status: 'error',
                message: '数据库连接失败',
                error: error.message,
            };
        }
    }
} 