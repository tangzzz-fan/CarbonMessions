import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ description: '密码重置令牌' })
    @IsNotEmpty({ message: '令牌不能为空' })
    @IsString({ message: '令牌必须是字符串' })
    token: string;

    @ApiProperty({ description: '新密码' })
    @IsNotEmpty({ message: '新密码不能为空' })
    @IsString({ message: '新密码必须是字符串' })
    @MinLength(6, { message: '新密码长度不能少于6个字符' })
    newPassword: string;
} 