import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';

// 继承CreateUserDto但排除password字段，所有字段都是可选的
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
    @ApiProperty({ description: '新密码', required: false })
    @IsOptional()
    @IsString({ message: '密码必须是字符串' })
    @MinLength(6, { message: '密码长度不能少于6个字符' })
    newPassword?: string;

    @ApiProperty({ description: '当前密码（修改密码时需要）', required: false })
    @IsOptional()
    @IsString({ message: '当前密码必须是字符串' })
    currentPassword?: string;
} 