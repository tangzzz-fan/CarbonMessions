import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum';

// 模拟bcrypt
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn(),
}));

describe('UsersService', () => {
    let service: UsersService;
    let repository: Repository<User>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useClass: Repository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        repository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a new user successfully', async () => {
            const createUserDto = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password',
                role: Role.USER,
            };

            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            jest.spyOn(repository, 'create').mockReturnValue(createUserDto as any);
            jest.spyOn(repository, 'save').mockResolvedValue({
                id: 'some-uuid',
                ...createUserDto,
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            } as User);

            const result = await service.create(createUserDto);

            expect(result).toHaveProperty('id');
            expect(result.username).toEqual(createUserDto.username);
            expect(result.email).toEqual(createUserDto.email);
            expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
        });

        it('should throw ConflictException if username exists', async () => {
            const createUserDto = {
                username: 'existinguser',
                email: 'test@example.com',
                password: 'password',
                role: Role.USER,
            };

            jest.spyOn(repository, 'findOne').mockResolvedValue({ id: 'some-uuid' } as User);

            await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
        });
    });

    // 更多单元测试...
}); 