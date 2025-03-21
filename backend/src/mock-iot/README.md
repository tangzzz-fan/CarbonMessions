# 物流园区模拟IoT数据服务

本模块用于开发环境中模拟物流园区IoT设备数据上报，通过生成符合物流业务场景的设备数据来支持碳排放分析和预测功能的开发与测试。

## 注意

此模块仅用于开发和测试环境，不应在生产环境中使用。生产环境应使用实际的设备数据源。

## 功能特性

- 支持基于业务场景的数据生成（车辆进出、货物装卸、仓储作业等）
- 支持基于时间模式的数据生成（工作时间/非工作时间、高峰/低谷期）
- 模拟设备状态转换及对应的数据变化特征
- 设备之间的数据关联性模拟（上下游关系、空间临近关系）
- 支持异常场景模拟（设备故障、通信中断等）
- 从CSV文件加载基础模拟设备数据
- 支持一次性发布或持续模拟数据发送
- 支持高级随机数据生成（符合特定数值分布的数据）

## 业务场景模拟

系统支持以下典型物流园区业务场景的数据模拟：

### 车辆进出场景
模拟车辆进出园区过程中产生的一系列设备数据：

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

### 模拟IoT数据服务的curl命令示例
为了方便在开发环境中通过命令行使用模拟IoT数据服务，以下是各API端点对应的curl命令示例：

#### curl命令示例
**获取模拟数据状态**
```
curl -X GET http://localhost:3000/mock-iot/status
```

**重新加载模拟数据文件**
```
curl -X POST http://localhost:3000/mock-iot/reload
```

**开始持续模拟数据上报**
```
curl -X POST http://localhost:3000/mock-iot/start?interval=5000&devicesPerInterval=3&randomize=true
```

**停止模拟数据上报**
```
curl -X POST http://localhost:3000/mock-iot/stop
```

**一次性发布模拟数据**
```
curl -X POST http://localhost:3000/mock-iot/publish?count=10&interval=1000
```

**测试流程示例**

以下是一个完整的测试流程示例：

```bash
# 1. 检查当前状态
curl -X GET http://localhost:3000/mock-iot/status

# 2. 重新加载模拟数据
curl -X POST http://localhost:3000/mock-iot/reload

# 3. 发布10条测试数据
curl -X POST http://localhost:3000/mock-iot/publish

# 4. 开始持续模拟数据上报（每2秒发送2个设备数据）
curl -X POST "http://localhost:3000/mock-iot/start?interval=2000&devicesPerInterval=2"

# 5. 再次检查状态
curl -X GET http://localhost:3000/mock-iot/status

# 6. 停止模拟数据上报
curl -X POST http://localhost:3000/mock-iot/stop
```

这些命令可以帮助您在开发过程中快速测试和验证模拟IoT数据服务的功能。

