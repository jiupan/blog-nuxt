#!/bin/bash
set -e

echo "=== 停止旧容器 ==="
docker compose -f docker-compose.server.yml down

echo "=== 加载新镜像 ==="
docker load -i blog-app.tar

echo "=== 启动容器 ==="
docker compose -f docker-compose.server.yml up -d

echo "=== 等待数据库就绪 ==="
sleep 3

echo "=== 初始化/同步数据库 ==="
docker compose -f docker-compose.server.yml exec app npx --package prisma@6 prisma db push

echo "=== 部署完成 ==="
docker compose -f docker-compose.server.yml ps
