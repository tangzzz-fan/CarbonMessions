import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../constants/permissions.constant';

describe('RolesService', () => {
    let service: RolesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RolesService],
        }).compile();

        service = module.get<RolesService>(RolesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAllRoles', () => {
        it('should return all roles with their descriptions', () => {
            const roles = service.getAllRoles();
            expect(roles).toHaveLength(5); // 5个角色：ADMIN, MANAGER, OPERATOR, VIEWER, USER
            expect(roles.map(r => r.value)).toContain(Role.ADMIN);
            expect(roles.map(r => r.value)).toContain(Role.USER);
            expect(roles[0]).toHaveProperty('name');
            expect(roles[0]).toHaveProperty('value');
            expect(roles[0]).toHaveProperty('description');
        });
    });

    describe('getRoleDetails', () => {
        it('should return role details with permissions', () => {
            const adminDetails = service.getRoleDetails(Role.ADMIN);
            expect(adminDetails.role).toBe(Role.ADMIN);
            expect(adminDetails.permissions).toEqual(ROLE_PERMISSIONS[Role.ADMIN]);

            const userDetails = service.getRoleDetails(Role.USER);
            expect(userDetails.role).toBe(Role.USER);
            expect(userDetails.permissions).toEqual(ROLE_PERMISSIONS[Role.USER]);
        });

        it('should return empty permissions for unknown role', () => {
            const unknownDetails = service.getRoleDetails('unknown' as Role);
            expect(unknownDetails.role).toBe('unknown');
            expect(unknownDetails.permissions).toEqual([]);
        });
    });

    describe('hasPermission', () => {
        it('should correctly check if role has permission', () => {
            // ADMIN 应该拥有所有权限
            expect(service.hasPermission(Role.ADMIN, 'user:create')).toBe(true);

            // USER 应该只有有限的权限
            expect(service.hasPermission(Role.USER, 'user:create')).toBe(false);
            expect(service.hasPermission(Role.USER, 'device:read')).toBe(true);
        });

        it('should return false for unknown role or permission', () => {
            expect(service.hasPermission('unknown' as Role, 'user:create')).toBe(false);
            expect(service.hasPermission(Role.ADMIN, 'unknown:permission')).toBe(false);
        });
    });

    describe('getRoleHierarchy', () => {
        it('should return correct hierarchy levels', () => {
            expect(service.getRoleHierarchy(Role.ADMIN)).toBeGreaterThan(service.getRoleHierarchy(Role.MANAGER));
            expect(service.getRoleHierarchy(Role.MANAGER)).toBeGreaterThan(service.getRoleHierarchy(Role.OPERATOR));
            expect(service.getRoleHierarchy(Role.OPERATOR)).toBeGreaterThan(service.getRoleHierarchy(Role.VIEWER));
            expect(service.getRoleHierarchy(Role.VIEWER)).toBeGreaterThan(service.getRoleHierarchy(Role.USER));
        });

        it('should return 0 for unknown role', () => {
            expect(service.getRoleHierarchy('unknown' as Role)).toBe(0);
        });
    });

    describe('canManageRole', () => {
        it('should allow higher roles to manage lower roles', () => {
            expect(service.canManageRole(Role.ADMIN, Role.MANAGER)).toBe(true);
            expect(service.canManageRole(Role.ADMIN, Role.USER)).toBe(true);
            expect(service.canManageRole(Role.MANAGER, Role.OPERATOR)).toBe(true);
        });

        it('should not allow same or lower roles to manage higher roles', () => {
            expect(service.canManageRole(Role.MANAGER, Role.ADMIN)).toBe(false);
            expect(service.canManageRole(Role.USER, Role.VIEWER)).toBe(false);
            expect(service.canManageRole(Role.ADMIN, Role.ADMIN)).toBe(false); // 相同角色
        });
    });
}); 