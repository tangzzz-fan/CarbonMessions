import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesService } from './roles/roles.service';
import { Role } from './enums/role.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';

describe('UsersController - Role Management', () => {
    let controller: UsersController;
    let usersService: UsersService;
    let rolesService: RolesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: {
                        findOne: jest.fn(),
                        update: jest.fn(),
                        findAll: jest.fn(),
                    },
                },
                {
                    provide: RolesService,
                    useValue: {
                        canManageRole: jest.fn(),
                        getRoleDetails: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);
        usersService = module.get<UsersService>(UsersService);
        rolesService = module.get<RolesService>(RolesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('updateUserRole', () => {
        it('should update user role when admin has permission', async () => {
            const userId = 'user-id';
            const newRole = Role.OPERATOR;
            const req = { user: { id: 'admin-id', role: Role.ADMIN } };

            // 使用完整的User对象
            const user = {
                id: userId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword',
                role: Role.USER,
                fullName: '测试用户',
                department: '测试部门',
                position: '测试职位',
                phoneNumber: '13800138000',
                isActive: true,
                isEmailVerified: false,
                lastLogin: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            const updatedUser = {
                ...user,
                role: newRole
            } as User;

            jest.spyOn(rolesService, 'canManageRole').mockReturnValue(true);
            jest.spyOn(usersService, 'findOne').mockResolvedValue(user);
            jest.spyOn(usersService, 'update').mockResolvedValue(updatedUser);

            const result = await controller.updateUserRole(userId, newRole, req);

            expect(result).toEqual({
                message: '用户角色更新成功',
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    role: updatedUser.role,
                },
            });
            expect(rolesService.canManageRole).toHaveBeenCalledWith(req.user.role, newRole);
            expect(usersService.findOne).toHaveBeenCalledWith(userId);
            expect(usersService.update).toHaveBeenCalledWith(userId, { role: newRole });
        });

        it('should throw BadRequestException for invalid role', async () => {
            const userId = 'user-id';
            const newRole = 'invalid-role' as Role;
            const req = { user: { id: 'admin-id', role: Role.ADMIN } };

            // 模拟Object.values(Role)使其不包含newRole
            const originalValues = Object.values;
            Object.values = jest.fn().mockReturnValueOnce([Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER, Role.USER]);

            await expect(controller.updateUserRole(userId, newRole, req)).rejects.toThrow(BadRequestException);

            // 恢复原始方法
            Object.values = originalValues;
        });

        it('should throw ForbiddenException when admin cannot manage target role', async () => {
            const userId = 'user-id';
            const newRole = Role.ADMIN;
            const req = { user: { id: 'manager-id', role: Role.MANAGER } };

            jest.spyOn(rolesService, 'canManageRole').mockReturnValue(false);

            await expect(controller.updateUserRole(userId, newRole, req)).rejects.toThrow(ForbiddenException);
            expect(rolesService.canManageRole).toHaveBeenCalledWith(req.user.role, newRole);
        });

        it('should throw ForbiddenException when admin cannot manage user with higher role', async () => {
            const userId = 'admin-id';
            const newRole = Role.MANAGER;
            const req = { user: { id: 'manager-id', role: Role.MANAGER } };

            // 使用完整的User对象
            const user = {
                id: userId,
                username: 'admin',
                email: 'admin@example.com',
                password: 'hashedpassword',
                role: Role.ADMIN,
                fullName: '管理员',
                department: '系统部',
                position: '系统管理员',
                phoneNumber: '13900139000',
                isActive: true,
                isEmailVerified: true,
                lastLogin: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            jest.spyOn(rolesService, 'canManageRole')
                .mockReturnValueOnce(true)  // 第一次调用 - 检查目标角色
                .mockReturnValueOnce(false); // 第二次调用 - 检查用户角色
            jest.spyOn(usersService, 'findOne').mockResolvedValue(user);

            await expect(controller.updateUserRole(userId, newRole, req)).rejects.toThrow(ForbiddenException);
            expect(rolesService.canManageRole).toHaveBeenCalledWith(req.user.role, newRole);
            expect(rolesService.canManageRole).toHaveBeenCalledWith(req.user.role, user.role);
        });
    });

    describe('getUserPermissions', () => {
        it('should return user permissions', async () => {
            const userId = 'user-id';

            // 使用完整的User对象
            const user = {
                id: userId,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword',
                role: Role.MANAGER,
                fullName: '测试经理',
                department: '管理部',
                position: '经理',
                phoneNumber: '13800138000',
                isActive: true,
                isEmailVerified: false,
                lastLogin: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            const permissions = ['permission1', 'permission2'];
            const roleDetails = { role: Role.MANAGER, permissions };

            jest.spyOn(usersService, 'findOne').mockResolvedValue(user);
            jest.spyOn(rolesService, 'getRoleDetails').mockReturnValue(roleDetails);

            const result = await controller.getUserPermissions(userId);

            expect(result).toEqual({
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                },
                permissions,
            });
            expect(usersService.findOne).toHaveBeenCalledWith(userId);
            expect(rolesService.getRoleDetails).toHaveBeenCalledWith(user.role);
        });
    });

    describe('getUsersByRole', () => {
        it('should return users with specific role', async () => {
            const role = Role.MANAGER;

            // 使用完整的User对象数组
            const users = [
                {
                    id: 'user1',
                    username: 'manager1',
                    email: 'manager1@example.com',
                    password: 'hashedpassword1',
                    role: Role.MANAGER,
                    fullName: '经理1',
                    department: '部门1',
                    position: '经理',
                    phoneNumber: '13800138001',
                    isActive: true,
                    isEmailVerified: true,
                    lastLogin: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 'user2',
                    username: 'manager2',
                    email: 'manager2@example.com',
                    password: 'hashedpassword2',
                    role: Role.MANAGER,
                    fullName: '经理2',
                    department: '部门2',
                    position: '经理',
                    phoneNumber: '13800138002',
                    isActive: true,
                    isEmailVerified: true,
                    lastLogin: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ] as User[];

            jest.spyOn(usersService, 'findAll').mockResolvedValue(users);

            const result = await controller.getUsersByRole(role);

            expect(result).toEqual(users);
            expect(usersService.findAll).toHaveBeenCalledWith({ role });
        });

        it('should throw BadRequestException for invalid role', async () => {
            const role = 'invalid-role' as Role;

            // 模拟Object.values(Role)使其不包含role
            const originalValues = Object.values;
            Object.values = jest.fn().mockReturnValueOnce([Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER, Role.USER]);

            await expect(controller.getUsersByRole(role)).rejects.toThrow(BadRequestException);

            // 恢复原始方法
            Object.values = originalValues;
        });
    });
}); 