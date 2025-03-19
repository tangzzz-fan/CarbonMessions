import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { DeviceStatus } from '../enums/device-status.enum';
import { DeviceType } from '../enums/device-type.enum';
import { EnergyType } from '../enums/energy-type.enum';

export class QueryDeviceDto {
    @ApiProperty({ required: false, description: '设备名称(模糊查询)' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false, enum: DeviceType, description: '设备类型' })
    @IsOptional()
    @IsEnum(DeviceType)
    type?: DeviceType;

    @ApiProperty({ required: false, enum: DeviceStatus, description: '设备状态' })
    @IsOptional()
    @IsEnum(DeviceStatus)
    status?: DeviceStatus;

    @ApiProperty({ required: false, enum: EnergyType, description: '能源类型' })
    @IsOptional()
    @IsEnum(EnergyType)
    energyType?: EnergyType;

    @ApiProperty({ required: false, description: '位置' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ required: false, description: '操作员ID' })
    @IsOptional()
    @IsString()
    operatorId?: string;

    @ApiProperty({ required: false, description: '是否激活', type: Boolean })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    isActive?: boolean;
} 