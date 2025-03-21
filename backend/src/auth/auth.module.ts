import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { RolesModule } from '../users/roles/roles.module';

@Module({
    imports: [
        UsersModule,
        RolesModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'dev_fallback_secret_key',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '30d'
                },
            }),
        }),
    ],
    providers: [AuthService, LocalStrategy, JwtStrategy, RolesGuard],
    controllers: [AuthController],
    exports: [AuthService, JwtModule, RolesGuard],
})
export class AuthModule { } 