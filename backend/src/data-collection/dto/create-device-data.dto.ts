import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDataDto {
    @ApiProperty({
        description: '设备ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    @IsNotEmpty()
    deviceId: string;

    @ApiProperty({
        description: '数据值',
        example: 23.5
    })
    @IsNumber()
    @IsNotEmpty()
    value: number;

    @ApiProperty({
        description: '数据类型',
        example: 'temperature'
    })
    @IsString()
    @IsNotEmpty()
    type: string;
} 