/**
 * 模拟IoT数据配置接口
 */
export interface SimulationConfig {
    /** 发送数据的时间间隔(毫秒) */
    interval: number;

    /** 每个间隔发送的设备数量 */
    devicesPerInterval: number;

    /** 是否随机选择数据 */
    randomize: boolean;
} 