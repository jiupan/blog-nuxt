# Nuxt Dynamic Blog

一个基于 Nuxt 4 的全栈动态博客与轻量 CMS。项目包含面向 SEO 的 SSR 前台、内容管理后台，以及由 PostgreSQL、pgvector 驱动的 AI 与知识库能力。

## 功能特性

- 文章发布：Markdown 编辑、草稿与发布状态、置顶、封面和 SEO 信息
- 内容组织：分类、标签、归档、相关文章与动态菜单
- 管理后台：文章、分类、标签、菜单、图库和站点设置管理
- AI 工具：摘要、写作辅助、SEO 检查、链接检查、相关文章和站内问答
- 知识库：文章及文件分块、向量索引、混合检索与可选 rerank
- 用户系统：Session 登录、角色权限和 AI 使用记录
- 评论系统：Twikoo 评论、回复、审核和邮件通知
- SEO：SSR 页面、动态 sitemap 和 `robots.txt`

## 技术栈

- [Nuxt 4](https://nuxt.com/) / Vue 3 / TypeScript
- [Nuxt UI](https://ui.nuxt.com/) / md-editor-v3
- Nitro Server API / Prisma
- PostgreSQL 16 / pgvector
- Vitest / ESLint / vue-tsc
- Docker / Docker Compose

## 快速开始

### 环境要求

- Node.js 22（项目提供 `.nvmrc`）
- npm
- Docker 与 Docker Compose（用于启动 PostgreSQL + pgvector 和 Twikoo）

### 1. 配置环境变量

```bash
cp .env.example .env
```

至少需要检查以下配置：

```env
DATABASE_URL="postgresql://blog:blog_password@localhost:5432/nuxt_blog?schema=public"
NUXT_SESSION_PASSWORD="replace-with-at-least-32-characters-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-me-now"
SITE_URL="http://localhost:3000"
SITE_NAME="Jiupan Blog"
NUXT_PUBLIC_TWIKOO_ENV_ID="http://localhost:8080"
```

请将 `NUXT_SESSION_PASSWORD` 设置为至少 32 位的随机字符串，并修改默认管理员密码。

### 2. 启动数据库和评论服务

```bash
docker compose up -d postgres twikoo
```

本地数据库默认监听 `localhost:5432`，Twikoo 默认监听 `localhost:8080`。Compose 使用带 pgvector 扩展的 PostgreSQL 16 镜像，并将 Twikoo 数据保存在独立持久化卷中。

### 3. 安装依赖并初始化

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

Seed 会根据 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 创建初始管理员。

### 4. 启动开发服务器

```bash
npm run dev
```

访问地址：

- 博客前台：<http://localhost:3000>
- 管理后台：<http://localhost:3000/admin/login>
- AI 实验室：<http://localhost:3000/lab>

## AI 与知识库配置

基础博客功能不依赖 AI 配置。需要启用 AI 或 RAG 时，可在 `.env` 中补充：

```env
# 对话模型（兼容 OpenAI API 协议）
AI_API_KEY=""
AI_BASE_URL="https://api.deepseek.com"
AI_MODEL="deepseek-v4-flash"

# Embedding 模型
AI_EMBEDDING_API_KEY=""
AI_EMBEDDING_BASE_URL="https://api.openai.com/v1"
AI_EMBEDDING_MODEL="text-embedding-3-small"
AI_EMBEDDING_DIMENSIONS="1536"

# 可选 rerank
AI_RERANK_ENABLED="false"
AI_RERANK_API_KEY=""
AI_RERANK_BASE_URL="https://api.cohere.com/v2"
AI_RERANK_MODEL="rerank-v3.5"
AI_RERANK_TOP_N="8"
```

Embedding 维度应与数据库中的 `vector(1536)` 保持一致。配置完成后，可在后台知识库页面同步文章、上传文件或重建索引。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | 运行 ESLint |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 测试 |
| `npm run prisma:generate` | 生成 Prisma Client |
| `npm run prisma:migrate` | 创建并应用开发迁移 |
| `npm run prisma:studio` | 打开 Prisma Studio |
| `npm run db:seed` | 写入初始数据和管理员账号 |

## 项目结构

```text
app/                    Nuxt 页面、布局、组件、composable 与样式
server/api/             Nitro API 路由
server/services/        内容、AI、知识库及安全等业务逻辑
server/utils/           Prisma、认证、Markdown 等服务端工具
types/                  前后端共享类型与 DTO
prisma/                 数据模型、迁移与 seed
tests/                  Vitest 测试
public/                 静态资源
docs/                   架构、安全、缓存和部署文档
docker/                 Nginx 等容器配置
```

前台页面默认使用 SSR，`/admin/**` 后台页面使用客户端渲染；服务端 API 负责鉴权、参数校验和数据访问。

## 质量检查

提交代码前建议执行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 部署与更多文档

- [项目架构](docs/architecture.md)
- [API 边界约定](docs/api-boundaries.md)
- [安全策略](docs/security-policy.md)
- [内容缓存策略](docs/content-cache-strategy.md)
- [阿里云 ACR 自动部署](docs/deploy-acr.md)

项目提供 `Dockerfile`、本地 `docker-compose.yml` 和服务器用 `docker-compose.server.yml`。生产环境请使用强密码与正式域名，为 Twikoo 配置 HTTPS 反向代理，并持久化 PostgreSQL、Twikoo、上传目录和知识库文件目录；完整发布流程参见 ACR 自动部署文档。
