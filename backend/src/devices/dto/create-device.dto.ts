import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsDate, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceStatus } from '../enums/device-status.enum';
import { DeviceType } from '../enums/device-type.enum';
import { EnergyType } from '../enums/energy-type.enum';

export class CreateDeviceDto {
    @ApiProperty({ description: '设备名称' })
    @IsNotEmpty({ message: '设备名称不能为空' })
    @IsString({ message: '设备名称必须是字符串' })
    name: string;

    @ApiProperty({ description: '设备描述', required: false })
    @IsOptional()
    @IsString({ message: '设备描述必须是字符串' })
    description?: string;

    @ApiProperty({ enum: DeviceType, description: '设备类型', default: DeviceType.OTHER })
    @IsEnum(DeviceType, { message: '无效的设备类型' })
    type: DeviceType;

    @ApiProperty({ enum: DeviceStatus, description: '设备状态', default: DeviceStatus.INACTIVE })
    @IsEnum(DeviceStatus, { message: '无效的设备状态' })
    status: DeviceStatus;

    @ApiProperty({ description: '设备位置', required: false })
    @IsOptional()
    @IsString({ message: '设备位置必须是字符串' })
    location?: string;

    @ApiProperty({ description: '生产厂商', required: false })
    @IsOptional()
    @IsString({ message: '生产厂商必须是字符串' })
    manufacturer?: string;

    @ApiProperty({ description: '设备型号', required: false })
    @IsOptional()
    @IsString({ message: '设备型号必须是字符串' })
    model?: string;

    @ApiProperty({ description: '序列号', required: false })
    @IsOptional()
    @IsString({ message: '序列号必须是字符串' })
    serialNumber?: string;

    @ApiProperty({ description: '购买日期', required: false, type: Date })
    @IsOptional()
    @Type(() => Date)
    @IsDate({ message: '购买日期必须是有效的日期' })
    purchaseDate?: Date;

    @ApiProperty({ description: '预计使用年限(年)', required: false, type: Number })
    @IsOptional()
    @IsNumber({}, { message: '使用年限必须是数字' })
    lifespan?: number;

    @ApiProperty({ enum: EnergyType, description: '能源类型', default: EnergyType.ELECTRICITY })
    @IsEnum(EnergyType, { message: '无效的能源类型' })
    energyType: EnergyType;

    @ApiProperty({ description: '排放系数', default: 1.0 })
    @IsOptional()
    @IsNumber({}, { message: '排放系数必须是数字' })
    emissionFactor?: number;

    @ApiProperty({ description: '操作员ID', required: false })
    @IsOptional()
    @IsUUID('4', { message: '操作员ID必须是有效的UUID' })
    operatorId?: string;

    @ApiProperty({ description: '是否激活', default: true })
    @IsOptional()
    @IsBoolean({ message: '激活状态必须是布尔值' })
    isActive?: boolean;
} 