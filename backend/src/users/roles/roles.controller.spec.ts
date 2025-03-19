import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../constants/permissions.constant';

describe('RolesController', () => {
    let controller: RolesController;
    let service: RolesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RolesController],
            providers: [RolesService],
        }).compile();

        controller = module.get<RolesController>(RolesController);
        service = module.get<RolesService>(RolesService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllRoles', () => {
        it('should return all roles', () => {
            const result = [
                { name: '管理员', value: Role.ADMIN, description: '系统管理员，拥有所有权限' },
                // ... 其他角色
            ];
            jest.spyOn(service, 'getAllRoles').mockImplementation(() => result);

            expect(controller.getAllRoles()).toBe(result);
            expect(service.getAllRoles).toHaveBeenCalled();
        });
    });

    describe('getRoleDetails', () => {
        it('should return role details', () => {
            const result = {
                role: Role.ADMIN,
                permissions: ROLE_PERMISSIONS[Role.ADMIN],
            };
            jest.spyOn(service, 'getRoleDetails').mockImplementation(() => result);

            expect(controller.getRoleDetails(Role.ADMIN)).toBe(result);
            expect(service.getRoleDetails).toHaveBeenCalledWith(Role.ADMIN);
        });
    });

    describe('getRolePermissions', () => {
        it('should return role permissions', () => {
            const details = {
                role: Role.ADMIN,
                permissions: ['permission1', 'permission2'],
            };
            jest.spyOn(service, 'getRoleDetails').mockImplementation(() => details);

            const result = controller.getRolePermissions(Role.ADMIN);

            expect(result).toEqual({ permissions: details.permissions });
            expect(service.getRoleDetails).toHaveBeenCalledWith(Role.ADMIN);
        });
    });
}); 