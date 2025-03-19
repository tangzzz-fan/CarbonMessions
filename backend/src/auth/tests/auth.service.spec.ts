import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;
    let jwtService: JwtService;

    const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user',
        fullName: 'Test User',
        department: 'Test Dept',
        position: 'Tester'
    };

    const mockUsersService = {
        findByUsername: jest.fn(),
        findByEmail: jest.fn(),
        updateLastLogin: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn()
    };

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('test-token'),
        decode: jest.fn()
    };

    const mockConfigService = {
        get: jest.fn()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: mockUsersService
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService
                }
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        jwtService = module.get<JwtService>(JwtService);

        // 重置所有mock
        jest.clearAllMocks();
        jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should validate user with username successfully', async () => {
            mockUsersService.findByUsername.mockResolvedValue(mockUser);
            const result = await service.validateUser('testuser', 'password');
            expect(result).toBeDefined();
            expect(result.password).toBeUndefined();
            expect(result.username).toBe(mockUser.username);
        });

        it('should validate user with email successfully', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            const result = await service.validateUser('test@example.com', 'password');
            expect(result).toBeDefined();
            expect(result.email).toBe(mockUser.email);
        });

        it('should return null for invalid credentials', async () => {
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.findByEmail.mockResolvedValue(null);
            const result = await service.validateUser('invalid', 'password');
            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should generate JWT token and update last login', async () => {
            mockUsersService.updateLastLogin.mockResolvedValue(undefined);

            const result = await service.login(mockUser);

            expect(result.access_token).toBe('test-token');
            expect(result.user).toBeDefined();
            expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                username: mockUser.username,
                sub: mockUser.id,
                role: mockUser.role
            });
        });
    });

    describe('requestPasswordReset', () => {
        it('should generate password reset token', async () => {
            mockUsersService.findByEmail.mockResolvedValue(mockUser);
            mockConfigService.get.mockReturnValue(300); // 5分钟过期

            const result = await service.requestPasswordReset('test@example.com');

            expect(result.message).toBe('密码重置链接已发送');
            expect(result.token).toBeDefined();
        });

        it('should throw NotFoundException for non-existent email', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            const result = await service.requestPasswordReset('nonexistent@example.com');
            expect(result.message).toBe('如果该邮箱存在，我们已发送密码重置链接');
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            mockUsersService.findOne.mockResolvedValue(mockUser);
            mockJwtService.sign.mockReturnValue('new-test-token');

            const result = await service.refreshToken(mockUser.id);

            expect(result.access_token).toBe('new-test-token');
            expect(result.user).toBeDefined();
            expect(result.user.id).toBe(mockUser.id);
            expect(mockJwtService.sign).toHaveBeenCalledWith({
                username: mockUser.username,
                sub: mockUser.id,
                role: mockUser.role
            });
        });

        it('should throw NotFoundException for non-existent user', async () => {
            mockUsersService.findOne.mockResolvedValue(null);

            await expect(service.refreshToken('non-existent-id'))
                .rejects
                .toThrow('用户不存在');
        });
    });

    describe('isTokenExpiring', () => {
        it('should return true for token expiring within threshold', () => {
            const expiringToken = 'expiring-token';
            const currentTime = Date.now();
            const expirationTime = Math.floor((currentTime + 15 * 60 * 1000) / 1000); // 15分钟后过期

            mockJwtService.decode.mockReturnValue({ exp: expirationTime });

            const result = service.isTokenExpiring(expiringToken, 30); // 30分钟阈值

            expect(result).toBe(true);
            expect(mockJwtService.decode).toHaveBeenCalledWith(expiringToken);
        });

        it('should return false for token not expiring within threshold', () => {
            const validToken = 'valid-token';
            const currentTime = Date.now();
            const expirationTime = Math.floor((currentTime + 60 * 60 * 1000) / 1000); // 1小时后过期

            mockJwtService.decode.mockReturnValue({ exp: expirationTime });

            const result = service.isTokenExpiring(validToken, 30); // 30分钟阈值

            expect(result).toBe(false);
            expect(mockJwtService.decode).toHaveBeenCalledWith(validToken);
        });

        it('should return true for invalid token', () => {
            mockJwtService.decode.mockReturnValue(null);

            const result = service.isTokenExpiring('invalid-token');

            expect(result).toBe(true);
        });
    });
});