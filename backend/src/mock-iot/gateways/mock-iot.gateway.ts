import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MockIotEvents } from '../events/mock-iot.events';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'mock-iot'
})
export class MockIotGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(MockIotGateway.name);

    @WebSocketServer()
    server: Server;

    // 跟踪已连接的客户端
    private connectedClients: Map<string, { socket: Socket, subscriptions: Set<string> }> = new Map();

    constructor(private mockIotEvents: MockIotEvents) {
        // 订阅设备数据事件
        this.mockIotEvents.deviceData$.subscribe(data => {
            this.broadcastDeviceData(data);
        });

        // 订阅系统状态事件
        this.mockIotEvents.systemStatus$.subscribe(status => {
            this.broadcastSystemStatus(status);
        });

        // 订阅任务状态事件
        this.mockIotEvents.taskStatus$.subscribe(({ taskId, status }) => {
            this.broadcastTaskUpdate(taskId, status);
        });
    }

    // 连接处理
    handleConnection(client: Socket) {
        this.logger.log(`客户端连接: ${client.id}`);
        this.connectedClients.set(client.id, { socket: client, subscriptions: new Set() });
    }

    // 断开连接处理
    handleDisconnect(client: Socket) {
        this.logger.log(`客户端断开连接: ${client.id}`);
        this.connectedClients.delete(client.id);
    }

    // 订阅系统状态更新
    @SubscribeMessage('subscribeToSystemStatus')
    handleSubscribeToSystemStatus(client: Socket) {
        const clientData = this.connectedClients.get(client.id);
        if (clientData) {
            clientData.subscriptions.add('system-status');
            this.logger.log(`客户端 ${client.id} 订阅了系统状态`);
        }
        return { event: 'subscribed', data: 'system-status' };
    }

    // 订阅任务状态更新
    @SubscribeMessage('subscribeToTask')
    handleSubscribeToTask(client: Socket, taskId: string) {
        const clientData = this.connectedClients.get(client.id);
        if (clientData) {
            clientData.subscriptions.add(`task-${taskId}`);
            this.logger.log(`客户端 ${client.id} 订阅了任务 ${taskId}`);
        }
        return { event: 'subscribed', data: `task-${taskId}` };
    }

    // 取消订阅
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(client: Socket, topic: string) {
        const clientData = this.connectedClients.get(client.id);
        if (clientData) {
            clientData.subscriptions.delete(topic);
            this.logger.log(`客户端 ${client.id} 取消订阅了 ${topic}`);
        }
        return { event: 'unsubscribed', data: topic };
    }

    // 广播系统状态更新
    broadcastSystemStatus(statusData: any) {
        if (this.server) {
            this.server.emit('systemStatusUpdate', statusData);
            this.logger.debug('广播系统状态更新');
        }
    }

    // 广播新的设备数据
    broadcastDeviceData(deviceData: any) {
        if (this.server) {
            this.server.emit('newDeviceData', deviceData);
            this.logger.debug(`广播设备数据: ${deviceData.deviceId}`);
        }
    }

    // 广播任务状态更新
    broadcastTaskUpdate(taskId: string, status: any) {
        if (this.server) {
            this.server.emit(`taskUpdate-${taskId}`, status);
            this.logger.debug(`广播任务状态更新: ${taskId}`);
        }
    }
} 