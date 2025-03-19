import { Injectable, Logger } from '@nestjs/common';
import { DeviceData } from '../entities/device-data.entity';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name);
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private readonly processingQueue = 'data_processing_queue';
    private readonly predictionQueue = 'data_prediction_queue';
    private isConnected = false;

    constructor(private configService: ConfigService) {
        this.initializeRabbitMQ();
    }

    /**
     * 初始化RabbitMQ连接
     */
    private async initializeRabbitMQ() {
        try {
            const rabbitMqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@rabbitmq:5672';
            this.connection = await amqp.connect(rabbitMqUrl);
            if (this.connection) {
                this.channel = await this.connection.createChannel();

                // 确保队列存在
                if (this.channel) {
                    await this.channel.assertQueue(this.processingQueue, { durable: true });
                    await this.channel.assertQueue(this.predictionQueue, { durable: true });

                    this.isConnected = true;
                    this.logger.log('Successfully connected to RabbitMQ');

                    // 设置连接关闭时的处理逻辑
                    this.connection.on('close', () => {
                        this.logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
                        this.isConnected = false;
                        setTimeout(() => this.initializeRabbitMQ(), 5000);
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
            this.isConnected = false;
            // 尝试重新连接
            setTimeout(() => this.initializeRabbitMQ(), 5000);
        }
    }

    /**
     * 发送数据到处理队列
     * @param data 设备数据
     */
    async sendToProcessingQueue(data: DeviceData) {
        if (!this.isConnected || !this.channel) {
            this.logger.warn('Cannot send message: RabbitMQ not connected');
            return;
        }

        try {
            const message = JSON.stringify(data);
            this.channel.sendToQueue(this.processingQueue, Buffer.from(message), {
                persistent: true,
            });
            this.logger.debug(`Sent message to processing queue: ${message}`);
        } catch (error) {
            this.logger.error(`Failed to send message to processing queue: ${error.message}`);
        }
    }

    /**
     * 发送数据到预测队列
     * @param data 预处理后的数据
     */
    async sendToPredictionQueue(data: any) {
        if (!this.isConnected || !this.channel) {
            this.logger.warn('Cannot send message: RabbitMQ not connected');
            return;
        }

        try {
            const message = JSON.stringify(data);
            this.channel.sendToQueue(this.predictionQueue, Buffer.from(message), {
                persistent: true,
            });
            this.logger.debug(`Sent message to prediction queue: ${message}`);
        } catch (error) {
            this.logger.error(`Failed to send message to prediction queue: ${error.message}`);
        }
    }

    /**
     * 消费处理队列的消息
     * @param callback 处理消息的回调函数
     */
    async consumeProcessingQueue(callback: (data: any) => Promise<void>) {
        if (!this.isConnected || !this.channel) {
            this.logger.warn('Cannot consume messages: RabbitMQ not connected');
            return;
        }

        try {
            await this.channel.consume(this.processingQueue, async (msg) => {
                if (msg !== null && this.channel) {
                    try {
                        const data = JSON.parse(msg.content.toString());
                        await callback(data);
                        this.channel.ack(msg);
                    } catch (error) {
                        this.logger.error(`Error processing message: ${error.message}`);
                        // 根据错误类型决定是否重新入队
                        if (this.channel) {
                            this.channel.nack(msg, false, false);
                        }
                    }
                }
            });
            this.logger.log('Started consuming messages from processing queue');
        } catch (error) {
            this.logger.error(`Failed to consume messages from processing queue: ${error.message}`);
        }
    }
}