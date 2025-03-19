import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// 临时存储密码重置令牌（实际应用中应该使用数据库存储）
const passwordResetTokens = new Map<string, { userId: string, expiresAt: Date }>();

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async validateUser(username: string, password: string): Promise<any> {
        // 尝试通过用户名查找用户
        let user = await this.usersService.findByUsername(username);

        // 如果没找到，尝试通过邮箱查找
        if (!user) {
            user = await this.usersService.findByEmail(username);
        }

        // 如果找到用户并且密码匹配
        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        // 记录最后登录时间
        await this.usersService.updateLastLogin(user.id);

        const payload = { username: user.username, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
                department: user.department,
                position: user.position,
            },
        };
    }

    async register(createUserDto: any) {
        const user = await this.usersService.create(createUserDto);
        const { password, ...result } = user;
        return result;
    }

    // 请求密码重置
    async requestPasswordReset(email: string) {
        // 查找用户
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            // 为了安全，不暴露用户是否存在
            return { message: '如果该邮箱存在，我们已发送密码重置链接' };
        }

        // 生成令牌
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 令牌有效期1小时

        // 存储令牌（实际应用中应存储在数据库中）
        passwordResetTokens.set(token, {
            userId: user.id,
            expiresAt,
        });

        // 在实际应用中，这里应该发送带有重置链接的电子邮件
        // 简化版本只返回令牌（仅用于测试）
        return {
            message: '密码重置链接已发送',
            token, // 注意：实际产品中不应该返回令牌，这里仅用于测试
        };
    }

    // 重置密码
    async resetPassword(token: string, newPassword: string) {
        // 验证令牌
        const resetInfo = passwordResetTokens.get(token);
        if (!resetInfo) {
            throw new BadRequestException('无效的密码重置令牌');
        }

        // 检查令牌是否过期
        if (new Date() > resetInfo.expiresAt) {
            passwordResetTokens.delete(token);
            throw new BadRequestException('密码重置令牌已过期');
        }

        // 更新密码
        const user = await this.usersService.findOne(resetInfo.userId);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.update(user.id, {
            newPassword: hashedPassword,
            // 直接设置哈希密码，跳过验证
            // 注意：实际应用中可能需要更安全的实现
        });

        // 删除使用过的令牌
        passwordResetTokens.delete(token);

        return { message: '密码重置成功' };
    }
} 