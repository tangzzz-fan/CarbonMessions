import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        // 从请求头中获取 token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            // 检查 token 是否即将过期
            if (this.authService.isTokenExpiring(token)) {
                try {
                    // 解析 token 获取用户 ID
                    const payload = this.jwtService.verify(token);

                    // 刷新 token
                    const refreshedTokenData = await this.authService.refreshToken(payload.sub);

                    // 在响应头中添加新的 token
                    res.setHeader('Authorization', `Bearer ${refreshedTokenData}`); // 设置新的 token
                } catch (error) {
                    // 错误处理：token 无效，让请求继续，稍后会由 guard 处理
                    console.error('Token refresh failed:', error.message);
                }
            }
        }
        next();
    }
} 