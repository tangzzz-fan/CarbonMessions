import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            console.warn('警告: JWT_SECRET 未在环境变量中设置。使用默认开发密钥，请勿在生产环境中使用！');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret || 'dev_fallback_secret_key_do_not_use_in_production',
        });
    }

    async validate(payload: any) {
        if (!payload) {
            throw new UnauthorizedException('无效的令牌');
        }
        return { id: payload.sub, username: payload.username, role: payload.role };
    }
} 