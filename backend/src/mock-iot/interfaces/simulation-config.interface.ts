/**
 * 模拟数据生成配置接口
 */
export interface SimulationConfig {
    /**
     * 发送间隔(毫秒)
     */
    interval: number;

    /**
     * 每次发送的设备数量
     */
    devicesPerInterval: number;

    /**
     * 是否随机选择数据
     */
    randomize: boolean;
} 