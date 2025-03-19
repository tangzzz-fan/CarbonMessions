import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DeviceStatus } from '../enums/device-status.enum';
import { DeviceType } from '../enums/device-type.enum';
import { EnergyType } from '../enums/energy-type.enum';

@Entity('devices')
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

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

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'operator_id' })
    operator: User;

    @Column({ name: 'operator_id', nullable: true })
    operatorId: string;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
} 