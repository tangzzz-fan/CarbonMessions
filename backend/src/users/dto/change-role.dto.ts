import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class ChangeRoleDto {
    @ApiProperty({ description: '新角色', enum: Role })
    @IsNotEmpty({ message: '角色不能为空' })
    @IsEnum(Role, { message: '无效的角色类型' })
    role: Role;
} 