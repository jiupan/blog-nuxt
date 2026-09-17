<div align="center">

# Jiupan Blog

**A self-hosted Nuxt content platform with CMS, RAG search, article chat, and built-in tools.**

一个可自托管的 Nuxt 4 个人内容平台：在常规博客与 CMS 之上，整合 AI 内容工作流、RAG 知识库、文章对话和简历工坊。

[![Nuxt](https://img.shields.io/badge/Nuxt-4.4-00DC82?style=flat-square&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3-42B883?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

[项目亮点](#highlights) · [界面预览](#preview) · [系统架构](#architecture) · [快速开始](#quick-start) · [AI 与知识库](#ai-knowledge) · [项目文档](#documentation)

</div>

<a id="highlights"></a>

## ✨ 项目亮点

Jiupan Blog 以文章系统为基础，重点覆盖内容的创作、发布与后续复用：辅助写作、语义检索、站内问答、文章对话以及独立文件知识库。

| 模块 | 已实现能力 |
| --- | --- |
| 博客与 CMS | Markdown 编辑、草稿/发布、分类标签、归档、动态菜单、图库、SEO 与 Sitemap |
| AI 内容工作流 | 写作建议、摘要生成、SEO 检查、外链检查、关联文章、草稿整理、站点洞察与月度回顾 |
| RAG 知识库 | 文章和 Markdown / TXT / PDF / DOCX 文件分块，pgvector 向量检索、关键词检索、可选 Rerank |
| 问答与对话 | 带参考来源的站内问答，文章级流式对话，对话历史、重命名与删除 |
| 管理与安全 | 用户和角色管理、实时权限校验、操作审计、登录/注册/AI 限流 |
| 互动与工具 | Twikoo 评论；简历的结构化编辑、模板切换、JSON 导入导出、在线保存和 PDF 导出 |

### 一组贯穿内容生命周期的 AI 工具

AI 能力不只是一个聊天入口。它分布在选题、草稿、发布、SEO、旧文关联和内容复盘等环节。各功能复用统一的模型客户端和错误解析；面向普通用户的入口另有频率与每日配额限制。

### 一套可观测、可恢复的知识索引流程

后台可以管理文章和外部文件的入库状态、同步任务、查询记录与检索测试。异步 Worker 处理任务认领、心跳、超时恢复和失败重试，避免长时间索引操作阻塞管理请求。

### 把 AI 放进具体的阅读上下文

除了面向整站的问答和语义搜索，每篇文章还可以建立独立对话。服务端只在当前文章的索引片段内检索并流式回答，同时保留会话历史，而不是让读者离开文章去使用一个孤立聊天页。

### 一个与博客共享账户体系的简历工坊

简历工坊支持结构化编辑、自定义栏目、实时 A4 预览、版式参数调整、JSON 备份和服务端 PDF 导出；登录后可以管理多份简历。

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
