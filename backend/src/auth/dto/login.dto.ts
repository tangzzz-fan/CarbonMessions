import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'johndoe 或 john.doe@example.com', description: '用户名或邮箱' })
    @IsNotEmpty({ message: '用户名/邮箱不能为空' })
    @IsString({ message: '用户名/邮箱必须是字符串' })
    username: string;

    @ApiProperty({ example: 'password123', description: '密码' })
    @IsNotEmpty({ message: '密码不能为空' })
    @IsString({ message: '密码必须是字符串' })
    password: string;
} 