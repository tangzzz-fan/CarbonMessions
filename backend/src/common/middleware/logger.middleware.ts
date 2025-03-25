import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
        console.log('请求体:', req.body);

        // 记录响应
        const originalSend = res.send;
        res.send = function (body) {
            console.log(`[${new Date().toISOString()}] 响应状态: ${res.statusCode}`);
            return originalSend.call(this, body);
        };

        next();
    }
} 