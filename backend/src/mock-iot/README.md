# 模拟IoT数据服务

本模块用于开发环境中模拟IoT设备数据上报，通过读取CSV文件并将数据发送到数据采集服务来模拟真实设备数据流。

## 注意

此模块仅用于开发和测试环境，不应在生产环境中使用。生产环境应使用实际的Azure IoT Hub数据源。

## 功能特性

- 从CSV文件加载模拟设备数据
- 支持一次性发布指定数量的数据
- 支持持续模拟数据发送（类似于真实设备定期上报）
- 可配置发送间隔和数据选择方式
- 支持随机选择数据或顺序发送

## 使用方法

### 准备模拟数据

1. 在项目根目录创建`mock_data`文件夹
2. 在该文件夹中放置`mock_iot_storage.csv`文件，包含模拟设备数据

CSV文件格式示例：

```csv
device_id,timestamp,data_type,value,unit
DEV-TRK-A001,2023-08-10T08:30:00Z,fuel_consumption,12.5,L
DEV-FLT-F001,2023-08-10T08:40:00Z,power_consumption,15.2,kWh
```


### API端点

#### 获取模拟数据状态
```
GET /mock-iot/status
```

#### 重新加载模拟数据文件
```
POST /mock-iot/reload
```

#### 开始持续模拟数据上报
```
POST /mock-iot/start?interval=5000&devicesPerInterval=3&randomize=true
```

参数说明：
- `interval`: 发送间隔(毫秒)，默认5000ms
- `devicesPerInterval`: 每次发送的设备数量，默认3个
- `randomize`: 是否随机选择数据，默认true

#### 停止模拟数据上报
```
POST /mock-iot/stop
```

#### 一次性发布模拟数据
```
POST /mock-iot/publish?count=10&interval=1000
```

参数说明：
- `count`: 发布数据的条数，默认10条
- `interval`: 发布间隔(毫秒)，默认1000ms

### 模拟数据处理流程

1. 系统从CSV文件加载模拟设备数据
2. 通过API触发数据发布（一次性或持续模式）
3. 模拟数据通过`DataCollectionService`进入标准的数据处理流程
4. 数据被保存到数据库并发送到RabbitMQ消息队列
5. 后续处理与真实设备数据完全相同

**注意**：此功能仅在`NODE_ENV`不为`production`时启用。
