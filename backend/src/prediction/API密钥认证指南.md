# 预测模块API密钥认证指南

## 概述

为了允许Python预测模块无需JWT token即可访问历史数据API，我们实现了API密钥认证机制。这种机制允许预测模块通过提供有效的API密钥来访问受保护的接口，而无需进行完整的JWT认证流程。

## 配置说明

### 环境变量配置

在后端服务的环境变量中，需要设置以下变量：

```
PREDICTION_API_KEY=your-secure-api-key
```

请确保使用足够复杂的密钥值，并妥善保管，不要将其提交到代码仓库中。

### 在预测模块中使用API密钥

当从预测模块访问历史数据API时，需要在HTTP请求头中包含API密钥：

```python
import requests

def get_historical_data(device_id, data_type, hours=24):
    """获取指定设备的历史数据"""
    # 设置API密钥
    headers = {
        'X-API-Key': 'your-secure-api-key'  # 替换为实际配置的API密钥
    }
    
    # 调用系统API获取历史数据
    response = requests.get(
        "http://localhost:3000/data-collection/historical-data",
        headers=headers,
        params={
            "deviceId": device_id,
            "type": data_type,
            "hours": hours
        }
    )
    
    if response.status_code == 200:
        # 处理响应数据
        return response.json()
    else:
        print(f"Error fetching historical data: {response.text}")
        return None
```

## 安全注意事项

1. API密钥应当被视为敏感信息，与密码同等对待
2. 不要在代码中硬编码API密钥，应使用环境变量或配置文件
3. 在生产环境中，考虑定期轮换API密钥
4. 如果怀疑API密钥泄露，应立即更换

## 故障排除

如果使用API密钥访问接口时遇到认证问题，请检查：

1. 环境变量`PREDICTION_API_KEY`是否正确设置
2. 请求头中的`X-API-Key`值是否与环境变量中配置的值完全匹配
3. 请求头名称是否正确（区分大小写）

如有其他问题，请联系系统管理员。