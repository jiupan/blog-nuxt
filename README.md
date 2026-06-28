# Nuxt Dynamic Blog

Nuxt 4 全栈动态博客，支持后台发文、PostgreSQL 存储、Markdown 编辑、SSR 展示、分类标签和 sitemap。

## 本地启动

1. 复制环境变量：

```bash
cp .env.example .env
```

2. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

3. 安装依赖并初始化数据库：

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

默认后台地址：`/admin/login`。

管理员账号来自 `.env`：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-now
```
