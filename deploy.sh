#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: /opt/blog-nuxt/.env 不存在，请先创建生产环境配置。"
  exit 1
fi

set -a
. ./.env
set +a

required_vars="APP_IMAGE POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL NUXT_SESSION_PASSWORD ADMIN_USERNAME ADMIN_PASSWORD SITE_URL SITE_NAME NUXT_PUBLIC_TWIKOO_ENV_ID"
for var_name in $required_vars; do
  if [ -z "${!var_name}" ]; then
    echo "ERROR: .env 缺少 $var_name"
    exit 1
  fi
done

case "$DATABASE_URL" in
  *"@localhost:"*|*"@127.0.0.1:"*)
    echo "ERROR: Docker 生产环境 DATABASE_URL 不能指向 localhost，请改为 postgres 服务名。"
    echo "示例: postgresql://$POSTGRES_USER:***@postgres:5432/$POSTGRES_DB?schema=public"
    exit 1
    ;;
esac

echo "=== 拉取新镜像 ==="
for attempt in 1 2 3; do
  if docker compose -f docker-compose.server.yml pull app; then
    break
  fi

  if [ "$attempt" -eq 3 ]; then
    echo "ERROR: 连续 3 次拉取镜像失败，终止部署。" >&2
    exit 1
  fi

  retry_delay=$((attempt * 10))
  echo "镜像拉取失败，${retry_delay} 秒后重试（$((attempt + 1))/3）..." >&2
  sleep "$retry_delay"
done

echo "=== 启动数据库和 Twikoo ==="
docker compose -f docker-compose.server.yml up -d postgres twikoo

echo "=== 等待数据库就绪 ==="
docker compose -f docker-compose.server.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "=== 执行数据库迁移 ==="
timeout --foreground 10m docker compose -f docker-compose.server.yml run --rm --no-deps app prisma migrate deploy

echo "=== 启动/更新应用容器 ==="
docker compose -f docker-compose.server.yml up -d app

echo "=== 部署完成 ==="
docker compose -f docker-compose.server.yml ps
