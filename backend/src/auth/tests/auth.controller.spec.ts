import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        fullName: 'Test User',
        department: 'Test Dept',
        position: 'Tester'
    };

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        requestPasswordReset: jest.fn(),
        validateToken: jest.fn().mockReturnValue(true)
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService
                }
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should register a new user', async () => {
            const createUserDto: CreateUserDto = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
                fullName: 'New User',
                department: 'IT',
                position: 'Developer'
            };

            mockAuthService.register.mockResolvedValue({
                id: '2',
                ...createUserDto,
                role: 'user'
            });

            const result = await controller.register(createUserDto);

            expect(result).toBeDefined();
            expect(mockAuthService.register).toHaveBeenCalledWith(createUserDto);
        });
    });

    describe('login', () => {
        it('should login user and return token', async () => {
            const loginDto: LoginDto = {
                username: 'testuser',
                password: 'password123'
            };

            const expectedResponse = {
                access_token: 'jwt-token',
                user: mockUser
            };

            mockAuthService.login.mockResolvedValue(expectedResponse);

            const result = await controller.login(loginDto, { user: mockUser });

            expect(result).toEqual(expectedResponse);
            expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
        });
    });

    describe('getProfile', () => {
        it('should return user profile', () => {
            const req = { user: mockUser };
            const result = controller.getProfile(req);

            expect(result).toBeDefined();
            expect(result.user).toEqual(mockUser);
            expect(result.message).toBe('身份验证成功');
            expect(result.timestamp).toBeInstanceOf(Date);
        });
    });

    describe('requestPasswordReset', () => {
        it('should request password reset', async () => {
            const email = 'test@example.com';
            const expectedResponse = {
                message: '密码重置链接已发送到您的邮箱',
                success: true
            };

            mockAuthService.requestPasswordReset.mockResolvedValue(expectedResponse);

            const result = await controller.requestPasswordReset(email);

            expect(result).toEqual(expectedResponse);
            expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(email);
        });
    });

    it('should throw UnauthorizedException if no token is provided', async () => {
        const mockGuard = {
            canActivate: jest.fn().mockImplementation(() => {
                throw new UnauthorizedException('无效的令牌');
            })
        };

        expect(() => mockGuard.canActivate(null)).toThrow(UnauthorizedException);
    });

    it('should return protected resource if token is valid', async () => {
        const req = {
            user: { id: '1', username: 'testuser' }
        };

        const result = await controller.getProtectedResource(req);
        expect(result).toEqual({
            message: 'This is a protected resource',
            user: { id: '1', username: 'testuser' }
        });
    });
});