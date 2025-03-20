import { Test } from '@nestjs/testing';
import { MockIotController } from './mock-iot.controller';
import { MockIotService } from './mock-iot.service';

// 使用jest.mock()直接模拟依赖服务
jest.mock('./mock-iot.service');

describe('MockIotController', () => {
    let controller: MockIotController;
    let service: MockIotService;

    beforeEach(async () => {
        // 清除所有模拟的实现和实例
        jest.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            controllers: [MockIotController],
            providers: [MockIotService],
        }).compile();

        controller = moduleRef.get<MockIotController>(MockIotController);
        service = moduleRef.get<MockIotService>(MockIotService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getAllDeviceData', () => {
        it('应该返回所有设备数据', async () => {
            // 准备模拟数据
            const mockDeviceData = [{ id: '1', name: 'device1', data: {} }];

            // 设置模拟服务方法的返回值
            (service.getAllDeviceData as jest.Mock).mockResolvedValue(mockDeviceData);

            // 调用控制器方法
            const result = await controller.getAllDeviceData();

            // 验证服务方法被调用
            expect(service.getAllDeviceData).toHaveBeenCalled();

            // 验证返回值
            expect(result).toEqual(mockDeviceData);
        });
    });

    describe('getDeviceDataById', () => {
        it('应该返回指定ID的设备数据', async () => {
            // 准备模拟数据
            const deviceId = '123';
            const mockDeviceData = { id: deviceId, name: 'testDevice', data: {} };

            // 设置模拟服务方法的返回值
            (service.getDeviceDataById as jest.Mock).mockResolvedValue(mockDeviceData);

            // 调用控制器方法
            const result = await controller.getDeviceDataById(deviceId);

            // 验证服务方法被调用，并且传入了正确的参数
            expect(service.getDeviceDataById).toHaveBeenCalledWith(deviceId);

            // 验证返回值
            expect(result).toEqual(mockDeviceData);
        });
    });

    // 根据控制器中的其他方法添加更多测试...
}); 