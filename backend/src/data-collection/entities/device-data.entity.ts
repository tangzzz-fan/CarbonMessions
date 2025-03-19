import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Device } from '../../devices/entities/device.entity';

@Entity('device_data')
export class DeviceData {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Device, device => device.deviceData, { onDelete: 'CASCADE' })
    device: Device;

    @Column({ type: 'uuid' })
    deviceId: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    timestamp: Date;

    @Column({ type: 'float' })
    value: number;

    @Column()
    type: string; // 例如：temperature, humidity, power_consumption
} 