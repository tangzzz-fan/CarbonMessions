import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // 检查当前路由是否标记为公开
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 如果是公开的，允许访问
        if (isPublic) {
            return true;
        }

        // 检查请求是否已通过API密钥验证
        const request = context.switchToHttp().getRequest();
        if (request.isApiKeyAuthenticated) {
            return true;
        }

        // 否则进行常规的JWT验证
        return super.canActivate(context);
    }
}