import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class MockIotEvents {
    // 设备数据事件流
    private deviceDataSubject = new Subject<any>();
    public deviceData$ = this.deviceDataSubject.asObservable();

    // 系统状态事件流
    private systemStatusSubject = new Subject<any>();
    public systemStatus$ = this.systemStatusSubject.asObservable();

    // 任务状态事件流
    private taskStatusSubject = new Subject<{ taskId: string, status: any }>();
    public taskStatus$ = this.taskStatusSubject.asObservable();

    // 发布设备数据
    publishDeviceData(data: any) {
        this.deviceDataSubject.next(data);
    }

    // 发布系统状态
    publishSystemStatus(status: any) {
        this.systemStatusSubject.next(status);
    }

    // 发布任务状态
    publishTaskStatus(taskId: string, status: any) {
        this.taskStatusSubject.next({ taskId, status });
    }
} 