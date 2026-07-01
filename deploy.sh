#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== 拉取新镜像 ==="
docker compose -f docker-compose.server.yml pull app

echo "=== 启动/更新应用容器 ==="
docker compose -f docker-compose.server.yml up -d app

echo "=== 执行数据库迁移 ==="
docker compose -f docker-compose.server.yml exec app npx --package prisma@6 prisma migrate deploy

echo "=== 部署完成 ==="
docker compose -f docker-compose.server.yml ps
