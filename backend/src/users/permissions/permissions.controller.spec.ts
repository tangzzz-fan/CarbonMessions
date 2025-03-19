import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../constants/permissions.constant';

describe('PermissionsController', () => {
    let controller: PermissionsController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PermissionsController],
        }).compile();

        controller = module.get<PermissionsController>(PermissionsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllPermissions', () => {
        it('should return all permissions with descriptions', () => {
            const permissions = controller.getAllPermissions();

            expect(permissions).toBeInstanceOf(Array);
            expect(permissions.length).toEqual(Object.keys(PERMISSIONS).length);

            // 检查返回的权限格式
            permissions.forEach(permission => {
                expect(permission).toHaveProperty('key');
                expect(permission).toHaveProperty('value');
                expect(permission).toHaveProperty('description');
            });

            // 检查所有权限都被包含
            const permissionValues = permissions.map(p => p.value);
            Object.values(PERMISSIONS).forEach(permValue => {
                expect(permissionValues).toContain(permValue);
            });
        });
    });

    describe('getRolePermissions', () => {
        it('should return role-permission mapping', () => {
            const result = controller.getRolePermissions();

            expect(result).toEqual(ROLE_PERMISSIONS);

            // 检查结构是否正确
            Object.keys(result).forEach(role => {
                expect(Array.isArray(result[role])).toBe(true);
            });
        });
    });

    describe('getPermissionDescription', () => {
        it('should return correct description for known permission', () => {
            // 通过private方法反射访问
            const description = (controller as any).getPermissionDescription('user:create');
            expect(description).toBe('创建用户');
        });

        it('should return permission itself for unknown permission', () => {
            // 通过private方法反射访问
            const unknownPerm = 'unknown:permission';
            const description = (controller as any).getPermissionDescription(unknownPerm);
            expect(description).toBe(unknownPerm);
        });
    });
}); 