# 物流园区模拟数据生成器使用指南

本文档提供物流园区 IoT 模拟数据生成系统的详细说明，帮助开发者快速生成适合不同场景的测试数据，支持碳排放分析和监测等功能的开发与测试。

## 目录

- [概述](#概述)
- [API端点速查表](#api端点速查表)
- [设备生成功能](#设备生成功能)
  - [基础设备生成](#基础设备生成)
  - [物流园区专用设备](#物流园区专用设备)
  - [碳排放监测设备](#碳排放监测设备)
- [业务场景模拟](#业务场景模拟)
  - [车辆进出场景](#车辆进出场景)
  - [装卸区作业场景](#装卸区作业场景)
  - [异步装卸区作业](#异步装卸区作业)
  - [碳排放高峰场景](#碳排放高峰场景)
  - [碳减排措施场景](#碳减排措施场景)
- [时间模式模拟](#时间模式模拟)
  - [工作日高峰期模式](#工作日高峰期模式)
  - [夜间模式](#夜间模式)
- [时间序列数据生成](#时间序列数据生成)
  - [碳排放时间序列](#碳排放时间序列)
  - [异步碳排放时间序列](#异步碳排放时间序列)
  - [预测数据集生成](#预测数据集生成)
- [连续数据模拟](#连续数据模拟)
  - [启动自动数据发送](#启动自动数据发送)
  - [停止数据发送](#停止数据发送)
  - [生成随机数据](#生成随机数据)
- [任务管理](#任务管理)
  - [查询任务状态](#查询任务状态)
  - [查询所有任务](#查询所有任务)
- [数据同步与管理](#数据同步与管理)
- [使用示例](#使用示例)
- [模拟设备管理](#模拟设备管理)
  - [获取所有模拟设备](#获取所有模拟设备)
  - [创建新的模拟设备](#创建新的模拟设备)
  - [查询指定模拟设备](#查询指定模拟设备)
  - [更新模拟设备](#更新模拟设备)
  - [删除模拟设备](#删除模拟设备)

## 概述

物流园区模拟数据生成器用于开发环境中模拟各类物流设备的运行数据，生成的数据遵循物流园区真实运营特征，特别支持碳排放相关的监测数据。此系统不应用于生产环境，仅用于开发和测试目的。

## API端点速查表

| 功能类别 | API端点 | 描述 |
|---------|---------|------|
| **设备管理** | | |
| | `GET /mock-iot` | 获取所有模拟设备 |
| | `POST /mock-iot` | 创建新的模拟设备 |
| | `GET /mock-iot/{id}` | 获取指定的模拟设备 |
| | `PUT /mock-iot/{id}` | 更新指定的模拟设备 |
| | `DELETE /mock-iot/{id}` | 删除指定的模拟设备 |
| **设备生成** | | |
| | `POST /mock-iot/generate/basic-devices` | 生成基本模拟设备 |
| | `POST /mock-iot/generate/logistics-devices` | 生成物流园区专用设备 |
| | `POST /mock-iot/generate/carbon-devices` | 生成碳排放监测设备 |
| **业务场景** | | |
| | `POST /mock-iot/scenario/vehicle-entry` | 模拟车辆进入园区场景 |
| | `POST /mock-iot/scenario/loading` | 模拟装卸区作业场景 |
| | `POST /mock-iot/scenario/loading/async` | 异步模拟装卸区作业场景 |
| | `POST /mock-iot/scenario/carbon-peak` | 模拟碳排放高峰期场景 |
| | `POST /mock-iot/scenario/carbon-reduction` | 模拟碳减排措施场景 |
| **时间序列数据** | | |
| | `POST /mock-iot/time-series/carbon-emission` | 生成碳排放时间序列数据 |
| | `POST /mock-iot/time-series/carbon-emission/async` | 异步生成碳排放时间序列数据 |
| | `POST /mock-iot/time-series/prediction-dataset` | 生成碳排放预测数据集 |
| **任务管理** | | |
| | `GET /mock-iot/tasks` | 查询所有模拟任务 |
| | `GET /mock-iot/tasks/{taskId}` | 查询指定模拟任务状态 |
| **时间模式** | | |
| | `POST /mock-iot/time-pattern/workday-peak` | 模拟工作日高峰期数据 |
| | `POST /mock-iot/time-pattern/night` | 模拟夜间数据模式 |
| **连续模拟** | | |
| | `POST /mock-iot/start` | 开始持续模拟数据上报 |
| | `POST /mock-iot/stop` | 停止模拟数据上报 |
| | `POST /mock-iot/publish` | 一次性发布模拟设备数据 |
| | `POST /mock-iot/generate-random` | 生成并发送随机设备数据 |
| **数据管理** | | |
| | `POST /mock-iot/reload` | 重新加载模拟数据 |
| | `POST /mock-iot/sync-devices` | 从CSV文件同步设备数据 |
| | `GET /mock-iot/status` | 获取模拟数据状态 |

## 设备生成功能

### 基础设备生成

生成基础模拟设备，可以指定数量，系统会随机分配设备类型。 
```bash
#生成10个基础模拟设备
curl -X POST "http://localhost:3000/mock-iot/generate/basic-devices?count=10"
```

### 物流园区专用设备

生成物流园区常见设备组合，包括：门禁、称重设备、摄像头、装载机、传送带、叉车、充电站、暖通空调、照明和安防设备。

```bash
# 生成物流园区专用设备组合
curl -X POST "http://localhost:3000/mock-iot/generate/logistics-devices"
```

### 碳排放监测设备

生成碳排放监测专用设备，包括：碳排放传感器、能源表、气体分析仪、空气质量监测器等。

```bash
# 生成碳排放监测设备
curl -X POST "http://localhost:3000/mock-iot/generate/carbon-devices"
```

## 业务场景模拟

### 车辆进出场景

模拟车辆进入物流园区的完整流程数据，包括门禁识别、摄像头捕获、称重和门禁开关等过程。

```bash
# 模拟5辆车进入园区
curl -X POST "http://localhost:3000/mock-iot/scenario/vehicle-entry?count=5"
```

### 装卸区作业场景

模拟装卸区设备协同作业的完整流程，包括装载机、传送带等设备的运行数据。

```bash
# 模拟装卸区60分钟的作业，每5分钟采集一次数据
curl -X POST "http://localhost:3000/mock-iot/scenario/loading?duration=60&interval=5"
```

### 异步装卸区作业

异步模拟装卸区作业场景，不阻塞请求，立即返回任务ID，在后台执行模拟。适用于长时间运行的模拟场景。

```bash
# 异步模拟装卸区60分钟的作业，每5分钟采集一次数据
curl -X POST "http://localhost:3000/mock-iot/scenario/loading/async?duration=60&interval=5"
```

返回示例：
```json
{
  "success": true,
  "message": "已开始异步模拟装卸区60分钟的作业数据，间隔5分钟",
  "taskId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 碳排放高峰场景

模拟物流园区碳排放高峰期的数据特征，所有设备处于高负载状态，产生较高的碳排放值。

```bash
# 模拟碳排放高峰期
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-peak"
```

### 碳减排措施场景

模拟实施碳减排措施后的数据模式，展示各类设备在低能耗模式下的运行特征。

```bash
# 模拟碳减排措施效果
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-reduction"
```

## 时间模式模拟

### 工作日高峰期模式

模拟工作日高峰时段（如上午9-11点、下午2-4点）的设备运行数据模式。

```bash
# 模拟工作日高峰期数据模式
curl -X POST "http://localhost:3000/mock-iot/time-pattern/workday-peak"
```

### 夜间模式

模拟夜间时段（如晚上10点至次日凌晨5点）的低活动模式，大部分设备处于休眠或低功率状态。

```bash
# 模拟夜间数据模式
curl -X POST "http://localhost:3000/mock-iot/time-pattern/night"
```

## 时间序列数据生成

特别为碳排放分析和预测功能提供的时间序列数据生成，能够创建满足各种模型训练需求的历史数据和预测数据集。

### 碳排放时间序列

生成指定时间范围内的连续碳排放时间序列数据，支持趋势、季节性、噪声等参数配置。

```bash
# 生成过去30天的碳排放时间序列数据，每小时一个采样点
curl -X POST "http://localhost:3000/mock-iot/time-series/carbon-emission?days=30&interval=60"

# 带自定义参数的碳排放时间序列数据
curl -X POST "http://localhost:3000/mock-iot/time-series/carbon-emission?days=90&interval=30&trend=0.2&seasonality=0.7&noise=0.3"
```

参数说明：
- `days`: 要生成的历史天数，默认30天，最大365天
- `interval`: 采样间隔(分钟)，默认60分钟，范围1-1440
- `trend`: 趋势系数(-0.5到0.5)，默认0.1，正值表示上升趋势
- `seasonality`: 季节性强度(0到1)，默认0.5，值越大季节波动越明显
- `noise`: 噪声强度(0到1)，默认0.2，值越大数据波动越随机

生成的时间序列数据特征：
- 工作时间段(8:00-18:00)排放较高
- 工作日(周一至周五)排放高于周末
- 季节性变化(冬夏两季排放较高，春秋较低)
- 长期趋势反映配置的trend参数

### 异步碳排放时间序列

异步生成碳排放时间序列数据，适用于长时间范围或高采样频率的场景，避免请求超时，立即返回任务ID。

```bash
# 异步生成过去30天的碳排放时间序列数据，每小时一个采样点
curl -X POST "http://localhost:3000/mock-iot/time-series/carbon-emission/async?days=30&interval=60"

# 带自定义参数的异步碳排放时间序列数据生成
curl -X POST "http://localhost:3000/mock-iot/time-series/carbon-emission/async?days=180&interval=30&trend=0.2&seasonality=0.7&noise=0.3"
```

返回示例：
```json
{
  "success": true,
  "message": "已开始异步生成碳排放时间序列数据，使用参数: 间隔=60分钟，趋势=0.1",
  "taskId": "550e8400-e29b-41d4-a716-446655440000"
}
```

异步生成的优势：
- 不会阻塞客户端请求，适合生成大量数据
- 可以通过任务ID查询生成进度
- 支持生成更长时间范围的数据（如6个月到一年）
- 即使生成大规模数据也不会导致请求超时

要查询任务状态和结果，可以使用任务管理API：

```bash
# 查询任务进度和状态
curl -X GET "http://localhost:3000/mock-iot/tasks/550e8400-e29b-41d4-a716-446655440000"
```

### 预测数据集生成

生成专门用于碳排放预测模型训练和测试的数据集，包含目标变量(碳排放)和相关影响因素。

```bash
# 生成过去90天的预测数据集，每小时一个采样点
curl -X POST "http://localhost:3000/mock-iot/time-series/prediction-dataset?days=90&interval=60"
```

参数说明：
- `days`: 要生成的历史天数，默认90天
- `interval`: 采样间隔(分钟)，默认60分钟
- `includeFactors`: 是否包含影响因素，默认true

生成的预测数据集特点：
- 包含碳排放值作为目标变量
- 包含多个影响因素：温度、湿度、人员密度、交通流量、生产活动等
- 因素之间存在合理的相关性（如温度与能耗的非线性关系）
- 具有日内模式、周内模式和季节性模式
- 包含一定程度的随机噪声

生成的预测数据集可用于以下机器学习模型训练：
- 时间序列预测：ARIMA、指数平滑法、Prophet等
- 回归分析：多元线性回归、随机森林、支持向量机等
- 深度学习：LSTM、GRU、transformer等时间序列模型

## 连续数据模拟

### 启动自动数据发送

启动连续的数据模拟上报，可设置发送间隔和每次发送的设备数量。

```bash
# 每3秒为5个随机设备生成数据
curl -X POST "http://localhost:3000/mock-iot/start?interval=3000&devicesPerInterval=5"
```

### 停止数据发送

停止当前进行的连续数据模拟。

```bash
# 停止模拟数据上报
curl -X POST "http://localhost:3000/mock-iot/stop"
```

### 生成随机数据

一次性生成指定条数的随机设备数据。

```bash
# 生成20条随机设备数据，范围在10-90之间
curl -X POST "http://localhost:3000/mock-iot/generate-random?count=20&minValue=10&maxValue=90"
```

## 任务管理

### 查询任务状态

查询特定异步任务的执行状态、进度和结果。

```bash
# 查询指定任务状态
curl -X GET "http://localhost:3000/mock-iot/tasks/550e8400-e29b-41d4-a716-446655440000"
```

返回示例：
```json
{
  "success": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": 45,
  "message": "已处理 4500/10000 条数据 (45%)",
  "startTime": "2025-03-21T08:15:00.000Z"
}
```

### 查询所有任务

查询所有正在运行或已完成的异步模拟任务。

```bash
# 查询所有任务
curl -X GET "http://localhost:3000/mock-iot/tasks"
```

## 数据同步与管理

从CSV文件同步设备数据：

```bash
# 从CSV文件同步设备数据
curl -X POST "http://localhost:3000/mock-iot/sync-devices"
```

重新加载模拟数据：

```bash
# 重新加载模拟数据
curl -X POST "http://localhost:3000/mock-iot/reload"
```

## 使用示例

### 完整物流园区模拟数据场景

下面是一个完整的工作流示例，用于生成物流园区的全面模拟数据：

1. 首先生成基础设备：

```bash
# 生成物流园区设备
curl -X POST "http://localhost:3000/mock-iot/generate/logistics-devices"

# 生成碳排放监测设备
curl -X POST "http://localhost:3000/mock-iot/generate/carbon-devices"
```

2. 然后模拟一天不同时段的数据模式：

```bash
# 早上高峰期
curl -X POST "http://localhost:3000/mock-iot/time-pattern/workday-peak"

# 模拟10辆车进入园区
curl -X POST "http://localhost:3000/mock-iot/scenario/vehicle-entry?count=10"

# 异步模拟装卸区作业（长时间运行无需等待）
curl -X POST "http://localhost:3000/mock-iot/scenario/loading/async?duration=120"

# 查询异步任务执行状态
curl -X GET "http://localhost:3000/mock-iot/tasks/{返回的taskId}"

# 夜间数据模式
curl -X POST "http://localhost:3000/mock-iot/time-pattern/night"
```

3. 碳排放监测专用场景：

```bash
# 模拟碳排放高峰期（如下午工作高峰）
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-peak"

# 模拟实施减排措施后的效果
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-reduction"
```

4. 启动连续模拟观察长期趋势：

```bash
# 每10秒生成7个设备的数据，持续运行
curl -X POST "http://localhost:3000/mock-iot/start?interval=10000&devicesPerInterval=7"
```

5. 完成测试后停止模拟：

```bash
# 停止所有模拟数据生成
curl -X POST "http://localhost:3000/mock-iot/stop"
```

---

**注意事项**：
- 所有模拟数据仅用于开发测试，不能代表实际物流园区的精确运行参数
- 碳排放模拟数据基于简化模型，仅供功能开发参考
- 在大规模持续模拟时，请注意系统资源占用
- 对于长时间运行的场景，推荐使用异步API，避免请求超时

### 碳排放预测场景使用示例

以下是使用模拟数据生成器为碳排放预测系统准备数据的完整工作流：

```bash
# 1. 生成碳排放监测设备
curl -X POST "http://localhost:3000/mock-iot/generate/carbon-devices"

# 2. 生成足够长的历史碳排放时间序列数据用于训练（使用异步API）
curl -X POST "http://localhost:3000/mock-iot/time-series/carbon-emission/async?days=180&interval=60&trend=0.15"

# 3. 查询异步任务状态
curl -X GET "http://localhost:3000/mock-iot/tasks/{返回的taskId}"

# 4. 生成包含影响因素的预测数据集
curl -X POST "http://localhost:3000/mock-iot/time-series/prediction-dataset?days=90&interval=60"

# 5. 模拟一些特殊场景的排放模式
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-peak"
curl -X POST "http://localhost:3000/mock-iot/scenario/carbon-reduction"

# 6. 持续生成实时数据用于测试预测模型
curl -X POST "http://localhost:3000/mock-iot/start?interval=3600&devicesPerInterval=5"
```

---

**注意事项**：
- 所有模拟数据仅用于开发测试，不能代表实际物流园区的精确运行参数
- 碳排放模拟数据基于简化模型，仅供功能开发参考
- 在大规模持续模拟时，请注意系统资源占用
- 对于长时间运行的场景，推荐使用异步API，避免请求超时
- 生成大型时间序列数据集可能需要较长处理时间，请耐心等待

## 模拟设备管理

### 获取所有模拟设备

查询系统中所有可用的模拟设备：

```bash
curl -X GET "http://localhost:3000/mock-iot"
```

### 创建新的模拟设备

手动创建自定义模拟设备：

```bash
curl -X POST "http://localhost:3000/mock-iot" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "CUSTOM-DEV-001",
    "name": "自定义模拟设备",
    "type": "custom_sensor",
    "description": "通过API创建的自定义设备",
    "location": "自定义位置"
  }'
```

### 查询指定模拟设备

通过ID查询特定的模拟设备：

```bash
curl -X GET "http://localhost:3000/mock-iot/CUSTOM-DEV-001"
```

### 更新模拟设备

更新现有模拟设备的属性：

```bash
curl -X PUT "http://localhost:3000/mock-iot/CUSTOM-DEV-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "已更新的设备名称",
    "location": "新位置",
    "status": "maintenance"
  }'
```

### 删除模拟设备

从系统中删除指定的模拟设备：

```bash
curl -X DELETE "http://localhost:3000/mock-iot/CUSTOM-DEV-001"
```