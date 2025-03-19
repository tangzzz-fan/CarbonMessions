import { IsOptional, IsUUID, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDeviceDataDto {
    @ApiProperty({
        description: '设备ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false
    })
    @IsUUID()
    @IsOptional()
    deviceId?: string;

    @ApiProperty({
        description: '开始时间',
        example: '2023-01-01T00:00:00Z',
        required: false
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startDate?: Date;

    @ApiProperty({
        description: '结束时间',
        example: '2023-01-31T23:59:59Z',
        required: false
    })
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endDate?: Date;

    @ApiProperty({
        description: '数据类型',
        example: 'temperature',
        required: false
    })
    @IsString()
    @IsOptional()
    type?: string;
} 