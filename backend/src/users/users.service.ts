import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        // 检查用户名或邮箱是否已存在
        const existingUser = await this.usersRepository.findOne({
            where: [
                { username: createUserDto.username },
                { email: createUserDto.email },
            ],
        });

        if (existingUser) {
            throw new ConflictException('用户名或邮箱已被使用');
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // 创建新用户
        const user = this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
            isActive: createUserDto.isActive ?? true,
            isEmailVerified: false,
        });

        return this.usersRepository.save(user);
    }

    async findAll(filters = {}): Promise<User[]> {
        return this.usersRepository.find({ where: filters });
    }

    async findOne(id: string): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) {
            throw new NotFoundException(`用户ID ${id} 不存在`);
        }
        return user;
    }

    async findByUsername(username: string): Promise<User | undefined> {
        return this.usersRepository.findOneBy({ username });
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return this.usersRepository.findOneBy({ email });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        // 处理密码更新
        if (updateUserDto.newPassword) {
            // 如果提供了当前密码，验证它
            if (updateUserDto.currentPassword) {
                const isPasswordValid = await bcrypt.compare(updateUserDto.currentPassword, user.password);
                if (!isPasswordValid) {
                    throw new BadRequestException('当前密码不正确');
                }
            }

            // 更新密码
            user.password = await bcrypt.hash(updateUserDto.newPassword, 10);

            // 删除DTO中的密码字段，避免后面的Object.assign再次覆盖
            delete updateUserDto.newPassword;
            delete updateUserDto.currentPassword;
        }

        // 更新用户信息
        const updatedUser = Object.assign(user, updateUserDto);
        return this.usersRepository.save(updatedUser);
    }

    async remove(id: string): Promise<void> {
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`用户ID ${id} 不存在`);
        }
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.findOne(userId);

        // 验证当前密码
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException('当前密码不正确');
        }

        // 更新密码
        user.password = await bcrypt.hash(newPassword, 10);
        await this.usersRepository.save(user);

        return { message: '密码修改成功' };
    }

    async updateLastLogin(userId: string): Promise<void> {
        await this.usersRepository.update(userId, {
            lastLogin: new Date()
        });
    }
} 