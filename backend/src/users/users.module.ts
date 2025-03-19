import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        RolesModule,
        PermissionsModule,
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService], // 导出服务以便其他模块使用
})
export class UsersModule { } 