import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: '用户注册' })
    @ApiResponse({ status: 201, description: '注册成功' })
    @ApiResponse({ status: 409, description: '用户名或邮箱已存在' })
    register(@Body() createUserDto: CreateUserDto) {
        return this.authService.register(createUserDto);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    @ApiOperation({ summary: '用户登录（支持用户名或邮箱）' })
    @ApiResponse({ status: 200, description: '登录成功' })
    @ApiResponse({ status: 401, description: '用户名/邮箱或密码错误' })
    async login(@Body() loginDto: LoginDto, @Request() req) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取用户资料（测试JWT）' })
    @ApiResponse({ status: 200, description: '成功获取用户资料' })
    @ApiResponse({ status: 401, description: '未授权' })
    getProfile(@Request() req) {
        return {
            message: '身份验证成功',
            user: req.user,
            timestamp: new Date(),
        };
    }

    @Post('request-password-reset')
    @ApiOperation({ summary: '请求密码重置' })
    @ApiResponse({ status: 200, description: '密码重置请求已发送' })
    async requestPasswordReset(@Body('email') email: string) {
        return this.authService.requestPasswordReset(email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: '重置密码' })
    @ApiResponse({ status: 200, description: '密码重置成功' })
    @ApiResponse({ status: 400, description: '无效的重置令牌' })
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.authService.resetPassword(
            resetPasswordDto.token,
            resetPasswordDto.newPassword
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('refresh-token')
    @ApiBearerAuth()
    @ApiOperation({ summary: '刷新访问令牌' })
    @ApiResponse({ status: 200, description: '令牌刷新成功' })
    @ApiResponse({ status: 401, description: '未授权' })
    async refreshToken(@Request() req) {
        return this.authService.refreshToken(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    getProtectedResource(@Request() req) {
        return { message: 'This is a protected resource', user: req.user };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @ApiBearerAuth()
    @ApiOperation({ summary: '用户登出' })
    @ApiResponse({ status: 200, description: '登出成功' })
    @ApiResponse({ status: 401, description: '未授权' })
    async logout(@Request() req) {
        const userId = req.user.id;
        await this.authService.logout(userId);

        return {
            message: '登出成功',
            timestamp: new Date(),
        };
    }
} 