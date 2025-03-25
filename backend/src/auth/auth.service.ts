import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';

// 临时存储密码重置令牌（实际应用中应该使用数据库存储）
const passwordResetTokens = new Map<string, { userId: string, expiresAt: Date }>();

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async validateUser(username: string, password: string): Promise<any> {
        try {
            // 尝试通过用户名查找用户，明确指定选择密码字段
            const user = await this.userRepository.findOne({
                where: { username },
                select: ['id', 'username', 'email', 'password', 'role', 'fullName', 'department', 'position']
            });

            // 添加额外的检查，确保用户存在且有密码哈希值
            if (!user || !user.password) {
                // 如果没找到用户，尝试通过邮箱查找
                const userByEmail = await this.userRepository.findOne({
                    where: { email: username },
                    select: ['id', 'username', 'email', 'password', 'role', 'fullName', 'department', 'position']
                });

                if (!userByEmail || !userByEmail.password) {
                    return null;
                }

                // 验证邮箱用户的密码
                const isMatch = await bcrypt.compare(password, userByEmail.password);
                if (isMatch) {
                    const { password, ...result } = userByEmail;
                    return result;
                }
                return null;
            }

            // 确保两个参数都存在后再进行比较
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const { password, ...result } = user;
                return result;
            }

            return null;
        } catch (error) {
            console.error('验证用户时出错:', error.message);
            throw new UnauthorizedException('验证失败');
        }
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

    async refreshToken(userId: string) {
        // 获取用户信息
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        // 生成新的 token
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

    // 可选：检查 token 是否即将过期
    isTokenExpiring(token: string, thresholdMinutes = 30): boolean {
        try {
            const decoded = this.jwtService.decode(token) as { exp: number };
            if (!decoded || !decoded.exp) return true;

            // 计算剩余有效期（毫秒）
            const expirationTime = decoded.exp * 1000; // 转换为毫秒
            const currentTime = Date.now();
            const timeLeft = expirationTime - currentTime;

            // 如果剩余时间小于阈值，认为即将过期
            return timeLeft < thresholdMinutes * 60 * 1000;
        } catch (error) {
            return true; // 解析错误视为需要刷新
        }
    }

    validateToken(token: string): any {
        try {
            // 使用 JwtService 验证 token
            const decoded = this.jwtService.verify(token);
            // 如果需要，可以根据解码后的信息查找用户
            return decoded; // 返回解码后的用户信息
        } catch (error) {
            // 如果 token 无效或过期，抛出未授权异常
            throw new UnauthorizedException('无效的 token');
        }
    }
} 