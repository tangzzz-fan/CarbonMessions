import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
    @ApiProperty({ example: 'johndoe', description: '用户名' })
    @IsNotEmpty({ message: '用户名不能为空' })
    @IsString({ message: '用户名必须是字符串' })
    username: string;

    @ApiProperty({ example: 'password123', description: '密码' })
    @IsNotEmpty({ message: '密码不能为空' })
    @IsString({ message: '密码必须是字符串' })
    @MinLength(6, { message: '密码长度不能少于6个字符' })
    password: string;

    @ApiProperty({ example: 'john.doe@example.com', description: '电子邮箱' })
    @IsNotEmpty({ message: '电子邮箱不能为空' })
    @IsEmail({}, { message: '电子邮箱格式不正确' })
    email: string;

    @ApiProperty({ example: 'user', description: '用户角色', enum: Role, default: Role.USER })
    @IsOptional()
    @IsEnum(Role, { message: '无效的用户角色' })
    role?: Role;

    @ApiProperty({ example: '张三', description: '用户全名', required: false })
    @IsOptional()
    @IsString({ message: '全名必须是字符串' })
    fullName?: string;

    @ApiProperty({ example: '物流部', description: '部门', required: false })
    @IsOptional()
    @IsString({ message: '部门必须是字符串' })
    department?: string;

    @ApiProperty({ example: '物流专员', description: '职位', required: false })
    @IsOptional()
    @IsString({ message: '职位必须是字符串' })
    position?: string;

    @ApiProperty({ example: '13800138000', description: '电话号码', required: false })
    @IsOptional()
    @IsString({ message: '电话号码必须是字符串' })
    phoneNumber?: string;

    @ApiProperty({ example: true, description: '是否激活账户', default: true })
    @IsOptional()
    @IsBoolean({ message: '是否激活必须是布尔值' })
    isActive?: boolean;
} 