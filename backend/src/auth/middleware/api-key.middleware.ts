import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) { }

    use(req: Request, res: Response, next: NextFunction) {
        // 获取配置的API密钥
        const configuredApiKey = this.configService.get<string>('PREDICTION_API_KEY');

        // 从请求头中获取API密钥
        const apiKey = req.headers['x-api-key'] as string;

        // 如果请求头中包含有效的API密钥，则将请求标记为已授权
        if (configuredApiKey && apiKey === configuredApiKey) {
            // 将请求标记为已通过API密钥验证
            req['isApiKeyAuthenticated'] = true;
        }

        next();
    }
}