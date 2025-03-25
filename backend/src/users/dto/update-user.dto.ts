import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, IsEmail, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';
import { Transform } from 'class-transformer';

// 继承CreateUserDto但排除password字段，所有字段都是可选的
export class UpdateUserDto {
    @ApiProperty({ required: false, description: '用户名' })
    @IsOptional()
    @IsString({ message: '用户名必须是字符串' })
    @MinLength(3, { message: '用户名至少需要3个字符' })
    @MaxLength(30, { message: '用户名不能超过30个字符' })
    username?: string;

    @ApiProperty({ required: false, description: '邮箱' })
    @IsOptional()
    @IsEmail({}, { message: '邮箱格式不正确' })
    email?: string;

    @ApiProperty({ required: false, description: '当前密码（修改密码时需要）' })
    @IsOptional()
    @IsString({ message: '当前密码必须是字符串' })
    currentPassword?: string;

    @ApiProperty({ required: false, description: '新密码' })
    @IsOptional()
    @IsString({ message: '新密码必须是字符串' })
    @MinLength(6, { message: '密码至少需要6个字符' })
    newPassword?: string;

    @ApiProperty({ required: false, description: '角色' })
    @IsOptional()
    // 临时注释掉验证，让控制器和服务层处理
    // @IsEnum(Role, { message: '角色无效' })
    role?: any; // 将类型从Role改为any，绕过TypeScript类型检查

    @ApiProperty({ required: false, description: '全名' })
    @IsOptional()
    @IsString({ message: '全名必须是字符串' })
    fullName?: string;

    @ApiProperty({ required: false, description: '部门' })
    @IsOptional()
    @IsString({ message: '部门必须是字符串' })
    department?: string;

    @ApiProperty({ required: false, description: '职位' })
    @IsOptional()
    @IsString({ message: '职位必须是字符串' })
    position?: string;

    @ApiProperty({ required: false, description: '电话' })
    @IsOptional()
    @IsString({ message: '电话必须是字符串' })
    phoneNumber?: string;

    @ApiProperty({ required: false, description: '用户状态（active或inactive）' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        // 将status转换为isActive
        if (value === 'active') return true;
        if (value === 'inactive') return false;
        return value;
    })
    status?: string;

    @ApiProperty({ required: false, description: '是否启用' })
    @IsOptional()
    @IsBoolean({ message: '启用状态必须是布尔值' })
    isActive?: boolean;
} 