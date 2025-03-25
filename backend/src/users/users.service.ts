import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum';

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

        // 增强角色处理
        if (updateUserDto.role !== undefined) {
            // 完整的角色映射表（包括多种可能的表示）
            const roleMap = {
                // 小写
                'admin': Role.ADMIN,
                'manager': Role.MANAGER,
                'operator': Role.OPERATOR,
                'viewer': Role.VIEWER,
                'user': Role.USER,
                // 大写
                'ADMIN': Role.ADMIN,
                'MANAGER': Role.MANAGER,
                'OPERATOR': Role.OPERATOR,
                'VIEWER': Role.VIEWER,
                'USER': Role.USER
            };

            const roleStr = String(updateUserDto.role).trim();
            const mappedRole = roleMap[roleStr];

            if (mappedRole) {
                updateUserDto.role = mappedRole;
            } else {
                throw new BadRequestException(`无效的角色: ${roleStr}`);
            }
        }

        // 将status转换为isActive
        if (updateUserDto.status !== undefined) {
            updateUserDto.isActive = updateUserDto.status === 'active';
            delete updateUserDto.status; // 删除status字段，因为实体中没有这个字段
        }

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

    async deleteAll(): Promise<void> {
        await this.usersRepository.delete({});
        return;
    }

    // 记录最后登出时间
    async updateLastLogout(userId: string): Promise<void> {
        await this.usersRepository.update(userId, {
            lastLogout: new Date(),
        });
    }

    // 添加分页查询方法
    async findAllPaginated(
        filters = {},
        page = 1,
        limit = 10
    ): Promise<[User[], number]> {
        const skip = (page - 1) * limit;

        return this.usersRepository.findAndCount({
            where: filters,
            skip,
            take: limit,
            order: {
                username: 'ASC'  // 默认按用户名排序
            }
        });
    }
}