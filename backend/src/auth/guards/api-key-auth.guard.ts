import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { API_KEY_AUTH_KEY } from '../decorators/api-key-auth.decorator';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private configService: ConfigService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        // 检查当前路由是否标记为允许API密钥认证
        const isApiKeyAuth = this.reflector.getAllAndOverride<boolean>(API_KEY_AUTH_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 如果没有标记为允许API密钥认证，则不通过此守卫
        if (!isApiKeyAuth) {
            return false;
        }

        const request = context.switchToHttp().getRequest();

        // 检查请求是否已通过API密钥中间件验证
        if (request.isApiKeyAuthenticated) {
            return true;
        }

        // 从请求头中获取API密钥
        const apiKey = request.headers['x-api-key'];
        const configuredApiKey = this.configService.get<string>('PREDICTION_API_KEY');

        // 验证API密钥
        return !!configuredApiKey && apiKey === configuredApiKey;
    }
}