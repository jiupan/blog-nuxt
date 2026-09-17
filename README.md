<div align="center">

<img src="./public/images/home-hero-ai.png" alt="Jiupan Blog AI banner" width="100%">

# Jiupan Blog

**A full-stack blog, a lightweight CMS, and an AI knowledge base — all in one Nuxt application.**

一个基于 Nuxt 4 的全栈动态博客：面向读者的 SSR 站点、面向创作者的内容后台，以及由 PostgreSQL + pgvector 驱动的 AI 知识库。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3-42B883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[项目亮点](#highlights) · [界面预览](#preview) · [系统架构](#architecture) · [快速开始](#quick-start) · [AI 与知识库](#ai-knowledge) · [项目文档](#documentation)

</div>

<a id="highlights"></a>

## ✨ 项目亮点

Jiupan Blog 不是只有文章列表的静态模板。它把内容创作、站点管理、用户体系、AI 工具和可自托管部署放进了同一套应用中。

| 内容与阅读 | AI 与知识库 | 管理与安全 | 互动与工具 |
| --- | --- | --- | --- |
| Markdown 写作与实时预览 | 站内问答与文章对话 | 完整的内容管理后台 | Twikoo 评论、回复与审核 |
| 草稿、发布、置顶与 SEO | 语义搜索与混合检索 | Session 认证与角色权限 | 简历编辑、模板与 PDF 导出 |
| 分类、标签、归档与动态菜单 | Markdown / TXT / PDF / DOCX 入库 | 用户、图库、设置与知识库管理 | 响应式界面与深浅色主题 |
| SSR、Sitemap 与 `robots.txt` | 可选 Rerank 与可靠任务队列 | 限流、安全响应头与审计记录 | JSON 导入导出与个人简历库 |

### 从写作到发布，不需要重新构建

文章、菜单和站点设置均保存在数据库中。在后台发布内容后，前台会通过 SSR 和 Nitro API 直接读取最新数据，无需为每篇文章重新构建站点。

### 让博客内容变成可检索、可对话的知识库

已发布文章和私有知识文件可以经过分块、Embedding 和 pgvector 索引后用于语义搜索、站内问答和文章对话。对话模型、Embedding 和 Rerank 都可分别配置兼容服务。

### 从公开站点到管理后台的完整闭环

项目包含文章、分类、标签、菜单、图库、侧边栏、用户、评论和知识库管理界面，不需要另外组装 CMS。

<a id="preview"></a>

## 🖼️ 界面预览

<a href="./docs/images/readme/home.png">
  <img src="./docs/images/readme/home.png" alt="Jiupan Blog 博客首页" width="100%">
</a>

<p align="center"><sub>响应式博客首页 · 置顶文章 · 分类筛选 · 个人信息侧边栏</sub></p>

<table>
  <tr>
    <td width="50%">
      <a href="./docs/images/readme/admin-dashboard.png">
        <img src="./docs/images/readme/admin-dashboard.png" alt="Jiupan Blog 管理后台仪表盘">
      </a>
    </td>
    <td width="50%">
      <a href="./docs/images/readme/resume-studio.png">
        <img src="./docs/images/readme/resume-studio.png" alt="Jiupan Blog 简历工坊">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"><sub><strong>内容管理后台</strong><br>数据概览、文章管理与快捷操作</sub></td>
    <td align="center"><sub><strong>简历工坊</strong><br>结构化编辑、实时预览与 PDF 导出</sub></td>
  </tr>
</table>

<a id="architecture"></a>

## 🏗️ 系统架构

```mermaid
flowchart LR
    Reader[读者] --> Web[Nuxt SSR 前台]
    Admin[管理员] --> Console[Nuxt 管理后台]
    Web --> API[Nitro Server API]
    Console --> API
    API --> Services[业务服务层]
    Services --> DB[(PostgreSQL + pgvector)]
    Services --> Models[OpenAI-compatible APIs]
    Worker[知识库 Worker] --> DB
    Worker --> Models
    Web --> Twikoo[Twikoo]
```

- 前台页面优先 SSR，兼顾首屏体验与 SEO。
- `/admin/**` 作为后台操作界面，真正的权限边界位于服务端 API。
- 复杂业务收敛到 `server/services/`，数据通过 Prisma 持久化。
- 知识库同步由带认领、心跳、重试和死任务恢复的 Worker 执行。

<a id="quick-start"></a>

## 🚀 快速开始

### 环境要求

- Node.js 22（仓库提供 `.nvmrc`）
- npm
- Docker 与 Docker Compose

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

本地启动前至少检查以下配置：

```env
DATABASE_URL="postgresql://blog:blog_password@localhost:5432/nuxt_blog?schema=public"
NUXT_SESSION_PASSWORD="replace-with-at-least-32-characters-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-me-now"
SITE_URL="http://localhost:3000"
SITE_NAME="Jiupan Blog"
NUXT_PUBLIC_TWIKOO_ENV_ID="http://localhost:8080"
```

> [!IMPORTANT]
> `NUXT_SESSION_PASSWORD` 至少使用 32 位随机字符；无论本地还是生产环境，都不要沿用默认管理员密码。

### 3. 启动依赖服务

```bash
docker compose up -d postgres twikoo
```

默认会启动 PostgreSQL 16 + pgvector 和 Twikoo，本地端口分别为 `5432` 与 `8080`。

### 4. 初始化数据库

```bash
npm run prisma:migrate
npm run db:seed
```

Seed 会创建初始管理员、示例分类、标签和文章。

### 5. 启动开发服务器

```bash
npm run dev
```

| 入口 | 地址 |
| --- | --- |
| 博客前台 | <http://localhost:3000> |
| 管理后台 | <http://localhost:3000/admin/login> |
| AI 实验室 | <http://localhost:3000/lab> |
| 工具箱 | <http://localhost:3000/tools> |

<a id="ai-knowledge"></a>

## 🧠 AI 与知识库

基础博客、CMS 和评论功能不依赖 AI 配置。需要启用 AI 创作、语义搜索或 RAG 时，在 `.env` 中额外添加：

```env
# 对话模型（OpenAI-compatible）
AI_API_KEY=""
AI_BASE_URL="https://api.deepseek.com"
AI_MODEL="deepseek-v4-flash"

# Embedding
AI_EMBEDDING_API_KEY=""
AI_EMBEDDING_BASE_URL="https://api.openai.com/v1"
AI_EMBEDDING_MODEL="text-embedding-3-small"
AI_EMBEDDING_DIMENSIONS="1536"

# 可选 Rerank
AI_RERANK_ENABLED="false"
AI_RERANK_API_KEY=""
AI_RERANK_BASE_URL="https://api.cohere.com/v2"
AI_RERANK_MODEL="rerank-v3.5"
AI_RERANK_TOP_N="8"
```

> [!NOTE]
> Embedding 维度必须与数据库中的 `vector(1536)` 保持一致。配置完成后，可在后台知识库中同步文章、上传文件或重建索引。

## 🧰 技术栈

| 领域 | 选型 |
| --- | --- |
| 应用框架 | Nuxt 4、Vue 3、TypeScript |
| UI 与内容 | Nuxt UI、Tailwind CSS、md-editor-v3、markdown-it、Shiki |
| 服务端 | Nitro Server API、Zod、nuxt-auth-utils、nuxt-security |
| 数据与检索 | PostgreSQL 16、pgvector、Prisma 6 |
| 图像与文档 | Nuxt Image、Sharp、Mammoth、PDF Parse、Playwright |
| 互动 | Twikoo |
| 质量与交付 | ESLint、vue-tsc、Vitest、Docker Compose |

## 🗂️ 项目结构

```text
app/                    Nuxt 页面、布局、组件、composable 与样式
server/api/             Nitro API 路由
server/services/        内容、AI、知识库、用户与安全业务
server/utils/           Prisma、认证、Markdown 与响应工具
types/                  前后端共享类型与 DTO
prisma/                 Schema、数据库迁移与 Seed
tests/                  Vitest 测试
public/                 公开静态资源
docs/                   架构、安全、缓存和部署文档
docker/                 Nginx 等容器配置
```

## ✅ 开发与质量检查

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

提交代码前建议运行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

> [!TIP]
> 数据库结构变更应同时提交 `prisma/schema.prisma` 和对应 migration，不要只更新 Schema。

## 📦 部署

项目提供：

- `Dockerfile`：生产镜像构建。
- `docker-compose.yml`：本地 PostgreSQL、Twikoo 与应用编排。
- `docker-compose.server.yml`：服务器环境编排。
- GitHub Actions + 阿里云 ACR 自动部署流程。

生产环境请使用强密码与 HTTPS，并持久化 PostgreSQL、Twikoo、上传目录和知识文件目录。完整流程参见 [ACR 自动部署手册](docs/deploy-acr.md)。

<a id="documentation"></a>

## 📖 项目文档

- [项目架构](docs/architecture.md)
- [API 边界约定](docs/api-boundaries.md)
- [认证和限流策略](docs/security-policy.md)
- [前台内容缓存策略](docs/content-cache-strategy.md)
- [阿里云 ACR 自动部署](docs/deploy-acr.md)

---

<div align="center">

Built with Nuxt, PostgreSQL and a little curiosity.

</div>
