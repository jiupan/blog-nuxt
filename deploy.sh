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

required_vars="APP_IMAGE POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL NUXT_SESSION_PASSWORD ADMIN_USERNAME ADMIN_PASSWORD SITE_URL SITE_NAME"
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

echo "=== 保留上一版镜像 ==="
image_repository="${APP_IMAGE%@*}"
if [[ "${image_repository##*/}" == *:* ]]; then
  image_repository="${image_repository%:*}"
fi
rollback_image="${image_repository}:rollback"
current_container_id=$(docker compose -f docker-compose.server.yml ps -a -q app)
if [ -n "$current_container_id" ]; then
  current_image_id=$(docker inspect --format '{{.Image}}' "$current_container_id")
  new_image_id=$(docker image inspect --format '{{.Id}}' "$APP_IMAGE")
  current_state=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$current_container_id")
  if [ "$current_image_id" != "$new_image_id" ]; then
    case "$current_state" in
      healthy|running)
        docker image tag "$current_image_id" "$rollback_image"
        echo "已保留回滚镜像：$rollback_image"
        ;;
      *)
        echo "WARNING: 当前应用状态为 $current_state，保留已有回滚标签，不覆盖。" >&2
        ;;
    esac
  fi
fi

echo "=== 启动数据库 ==="
docker compose -f docker-compose.server.yml up -d postgres

echo "=== 等待数据库就绪 ==="
docker compose -f docker-compose.server.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "=== 执行数据库迁移 ==="
timeout --foreground 10m docker compose -f docker-compose.server.yml run --rm --no-deps app prisma migrate deploy

echo "=== 启动/更新应用并等待健康检查 ==="
if ! docker compose -f docker-compose.server.yml up -d --no-deps --wait --wait-timeout 120 app; then
  echo "ERROR: 应用启动或健康检查失败，跳过镜像清理。回滚标签为 $rollback_image（如已有上一版）。" >&2
  docker compose -f docker-compose.server.yml ps || true
  exit 1
fi

echo "=== 清理博客的悬空镜像 ==="
if ! docker image prune -f --filter 'label=cn.ittx.blog.project=blog-nuxt'; then
  echo "WARNING: 旧镜像清理失败，应用已通过健康检查，本次部署仍视为成功。" >&2
fi

echo "=== 部署完成 ==="
docker compose -f docker-compose.server.yml ps
