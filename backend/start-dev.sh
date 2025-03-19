#!/bin/bash

# 设置环境变量
export NODE_ENV=dev

# 启动 Docker 容器
echo "正在启动 Docker 容器..."
docker-compose up -d

# 等待 PostgreSQL 启动
echo "等待 PostgreSQL 启动..."
sleep 5

# 启动 NestJS 应用
echo "启动 NestJS 应用..."
npm run start:dev 