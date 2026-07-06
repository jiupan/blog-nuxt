# 项目架构说明

本文档记录当前 Nuxt 动态博客项目的主要边界和请求链路，作为后续架构治理、重构和排查问题的基础参考。

## 项目定位

本项目是一个基于 Nuxt 4 的全栈动态博客/CMS：

- 前台页面支持 SSR 展示，面向公开访问和 SEO。
- 后台页面用于文章、分类、标签、菜单、图库、站点设置管理。
- 服务端 API 基于 Nitro `server/api`。
- 数据层使用 Prisma 访问 PostgreSQL，RAG 能力依赖 pgvector。
- AI 能力覆盖摘要、SEO、写作助手、站内问答、关联文章、链接检查等。

## 顶层目录职责

| 路径 | 职责 |
| --- | --- |
| `app/` | Nuxt 前端应用源码，包含页面、布局、组件、composable、样式 |
| `app/pages/` | 文件路由，包含前台页面和 `/admin/**` 后台页面 |
| `app/layouts/` | 前台和后台布局 |
| `app/components/` | 页面复用组件和后台业务组件 |
| `app/composables/` | 前端组合式状态和数据读取逻辑 |
| `server/api/` | Nitro API handler，负责鉴权、参数校验、调用服务、返回响应 |
| `server/services/` | 业务服务层，承载 AI、RAG、SEO、文章关联等复杂逻辑 |
| `server/utils/` | 服务端基础工具，如 Prisma、认证、Markdown、响应、slug、菜单 |
| `types/` | 前后端共享类型 |
| `prisma/` | Prisma schema、迁移和 seed |
| `public/` | 公开静态资源 |
| `uploads/` | 运行期上传资源目录 |
| `docker/` | Nginx 等容器相关配置 |
| `docs/` | 项目文档 |

## 运行时分层

```text
浏览器
  ↓
Nuxt App
  ├── 前台页面：SSR 优先
  └── 后台页面：/admin/** 客户端渲染
  ↓
Nitro server/api
  ↓
server/services 或 server/utils
  ↓
Prisma Client
  ↓
PostgreSQL + pgvector
```

## 前台请求链路

典型文章列表请求：

```text
app/pages/index.vue 或 app/pages/posts/index.vue
  ↓ useFetch('/api/posts')
server/api/posts/index.get.ts
  ↓ Prisma 查询已发布文章
PostgreSQL
  ↓
返回统一 ApiResult
```

公开文章接口必须遵守：

- 只返回 `status = PUBLISHED` 的文章。
- 发布时间不能晚于当前时间。
- 返回结构通过 `ok()` 包装为 `{ code, message, data }`。

## 文章详情链路

```text
app/pages/[slug].vue
  ↓ useFetch('/api/posts/:slug')
server/api/posts/[slug].get.ts
  ↓ 查询公开文章、增加浏览数、查询前后文章/相关文章
Prisma
  ↓
返回文章详情
```

当前前台详情路由使用根级动态路由 `[slug].vue`，需要注意它与静态页面路由的匹配关系。

## 后台请求链路

```text
app/pages/admin/**
  ↓ app/middleware/admin-auth.ts
/api/auth/me
  ↓
确认 ADMIN 后进入页面
  ↓
调用 /api/admin/**
  ↓
server/utils/auth.ts requireAdmin()
  ↓
Prisma 或 service
```

后台鉴权分两层：

- 前端中间件用于用户体验，未登录时跳转 `/admin/login`。
- 服务端 `requireAdmin()` 是真正的权限边界，每个 `/api/admin/**` 都应调用。

## 认证链路

```text
POST /api/auth/login
  ↓
校验用户名/邮箱和 Argon2 密码
  ↓
setUserSession()
  ↓
HttpOnly Cookie session
```

相关文件：

- `server/api/auth/login.post.ts`
- `server/api/auth/logout.post.ts`
- `server/api/auth/me.get.ts`
- `server/services/security/access-control.service.ts`
- `server/services/security/rate-limit.service.ts`
- `server/services/security/security-policy.ts`
- `server/utils/auth.ts`：兼容 re-export
- `types/auth.d.ts`

认证、角色和限流策略详见 `docs/security-policy.md`。

## 数据模型

核心 Prisma 模型：

- `User`：用户、角色、状态、AI 使用记录。
- `Post`：文章主体，包含 slug、状态、SEO、分类、发布时间。
- `Category` / `Tag` / `PostTag`：分类标签。
- `PostRelation`：文章关联关系。
- `PostChunk`：RAG 分块和向量索引。
- `Setting`：站点配置 KV。
- `Menu` / `MenuItem`：动态菜单。
- `AiUsageLog`：AI 使用记录。

## AI/RAG 链路

RAG 索引链路：

```text
POST /api/admin/ai/index/rebuild
  ↓ requireAdmin()
server/services/rag/indexer.service.ts
  ↓ 读取已发布文章
chunker.service.ts
  ↓ 生成 embedding
embeddings/embedding.service.ts
  ↓ 写入 PostChunk vector
PostgreSQL + pgvector
```

站内问答链路：

```text
POST /api/ai/ask
  ↓ withAiUsage()
server/services/rag/ask.service.ts
  ↓ searchPostChunks()
retrieval.service.ts
  ↓ 向量检索 + 关键词检索 + rerank
  ↓ generateBlogAnswer()
返回 answer + citations + relatedPosts
```

当前需要治理的点：

- `server/utils/ai.ts` 承担了过多 AI feature 职责，后续应迁移到 `server/services/ai/`。
- RAG raw SQL 应收口到 repository 边界，避免分散使用 `$queryRawUnsafe`。

## API 约定

当前成功响应统一使用：

```ts
{
  code: 0,
  message: string,
  data: T
}
```

公开内容接口使用短 `Cache-Control` 响应头，不缓存服务端数据库查询结果。详细策略见 `docs/content-cache-strategy.md`。

建议后续补齐：

- 分页响应类型。
- 错误响应约定。
- 前后端共享 DTO。
- 统一前端错误解析工具。

更详细的 API 命名、权限和数据可见性规则见 `docs/api-boundaries.md`。

## 当前主要技术债入口

- 大型前端文件：`app/layouts/default.vue`、`app/pages/lab.vue`、`app/components/admin/PostForm.vue`。
- AI 大工具文件：`server/utils/ai.ts`。
- 部分 API handler 直接写 Prisma 查询和领域规则。
- 页面内重复定义 API 返回类型。
- 缺少 `lint`、`test` 和足够的回归测试。
