import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ description: '当前密码' })
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    currentPassword: string;

    @ApiProperty({ description: '新密码' })
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: '密码必须包含至少一个大写字母、一个小写字母和一个数字或特殊字符'
    })
    newPassword: string;

    @ApiProperty({ description: '确认新密码' })
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    confirmPassword: string;
} 