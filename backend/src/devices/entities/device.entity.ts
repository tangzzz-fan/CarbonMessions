import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { DeviceData } from '../../data-collection/entities/device-data.entity';
import { User } from '../../users/entities/user.entity';
import { DeviceStatus } from '../enums/device-status.enum';
import { DeviceType } from '../enums/device-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { ConnectionType } from '../enums/connection-type.enum';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: false, unique: true })
    deviceId: string;

    @Column({
        type: 'enum',
        enum: DeviceType,
        default: DeviceType.OTHER
    })
    type: DeviceType;

    @Column({
        type: 'enum',
        enum: DeviceStatus,
        default: DeviceStatus.INACTIVE
    })
    status: DeviceStatus;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    manufacturer: string;

    @Column({ nullable: true })
    model: string;

    @Column({ nullable: true })
    serialNumber: string;

    @Column({ type: 'date', nullable: true })
    purchaseDate: Date;

    @Column({ type: 'int', nullable: true })
    lifespan: number;

    @Column({
        type: 'enum',
        enum: EnergyType,
        default: EnergyType.ELECTRICITY
    })
    energyType: EnergyType;

    @Column({ type: 'float', default: 1.0 })
    emissionFactor: number;

    @Column({ type: 'float', nullable: true })
    powerRating: number;

    @Column({ type: 'float', nullable: true })
    operatingVoltage: number;

    @Column({ type: 'float', nullable: true })
    operatingCurrent: number;

    @Column({ nullable: true })
    fuelType: string;

    @Column({ type: 'float', nullable: true })
    capacity: number;

    @Column({ nullable: true })
    unit: string;

    @Column({
        type: 'enum',
        enum: ConnectionType,
        default: ConnectionType.NONE
    })
    connectionType: ConnectionType;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'operator_id' })
    operator: User;

    @Column({ name: 'operator_id', nullable: true })
    operatorId: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 'private' })
    visibility: 'public' | 'private';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => DeviceData, deviceData => deviceData.device)
    deviceData: DeviceData[];
}