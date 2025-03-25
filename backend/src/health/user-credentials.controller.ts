import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('health/reset-password')
export class UserCredentialsController {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    @Post('admin')
    @HttpCode(HttpStatus.OK)
    async resetAdminPassword() {
        try {
            // 查找admin用户
            const admin = await this.userRepository.findOne({
                where: { username: 'admin' }
            });

            if (!admin) {
                return { success: false, message: '未找到admin用户' };
            }

            // 生成新的密码哈希
            const saltRounds = 10;
            const newPassword = 'admin123'; // 你可以设置任何密码
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            // 更新用户密码
            admin.password = passwordHash;
            await this.userRepository.save(admin);

            return {
                success: true,
                message: 'Admin密码已重置',
                // 不要在生产环境中返回密码信息
                debug: { username: 'admin', password: newPassword }
            };
        } catch (error) {
            return {
                success: false,
                message: '重置密码失败',
                error: error.message
            };
        }
    }

    @Post('custom')
    @HttpCode(HttpStatus.OK)
    async resetCustomPassword(
        @Body() body: { username: string; newPassword: string }
    ) {
        try {
            const { username, newPassword } = body;

            // 查找用户
            const user = await this.userRepository.findOne({
                where: { username }
            });

            if (!user) {
                return { success: false, message: `未找到用户: ${username}` };
            }

            // 生成新的密码哈希
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            // 更新用户密码
            user.password = passwordHash;
            await this.userRepository.save(user);

            return {
                success: true,
                message: `用户 ${username} 的密码已重置`
            };
        } catch (error) {
            return {
                success: false,
                message: '重置密码失败',
                error: error.message
            };
        }
    }
} 