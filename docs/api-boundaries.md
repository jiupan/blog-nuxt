# API 边界约定

本文档记录当前 Nitro API 的命名、权限和数据可见性规则。新增接口时应先对照本文件，再选择目录和鉴权 helper。认证、角色和限流细节见 `docs/security-policy.md`；公开内容缓存策略见 `docs/content-cache-strategy.md`。

## 通用响应

成功响应统一使用 `ok()`：

```ts
{
  code: 0,
  message: string,
  data: T
}
```

错误响应统一使用 `server/utils/api-error.ts`：

```ts
{
  statusCode: number,
  statusMessage: string,
  data: {
    code: string,
    message: string
  }
}
```

前端统一通过 `app/utils/api-error.ts` 读取错误状态、错误 code 和用户可见文案。
请求参数使用 `parseRequest(schema, input)` 校验。校验失败返回 HTTP 400，`data.code` 为 `VALIDATION_ERROR`，`data.issues` 包含字段路径与消息。

## 命名和权限规则

| 路径 | 权限 | 数据边界 | 说明 |
| --- | --- | --- | --- |
| `/api/admin/**` | 必须调用 `requireAdmin(event)` | 可访问后台管理数据 | 后台页面只能作为体验层保护，服务端 `requireAdmin()` 是真正边界 |
| `/api/ai/**` | 必须通过 `withAiUsage(event, feature, handler)` | 只能读取已发布文章或公开索引 | 登录、频率限制和使用额度都由 `withAiUsage()` 处理 |
| `/api/admin/ai/**` | 必须调用 `requireAdmin(event)` | 可读取草稿、后台统计和索引状态 | 后台 AI 工具不走普通用户额度 |
| `/api/agent/**` | 必须调用 `requireAgentToken(event)` | 授权的文章发布、图片上传和分类标签读取 | 使用独立的 Bearer 密钥，密钥管理走 `/api/admin/agent/**` |
| `/api/resumes/**` | 必须调用 `requireUser(event)` | 简历列表和编辑按当前用户隔离，导出使用当前请求提交的简历 | PDF 导出由登录用户发起 |
| `/api/posts/[slug]/comments/**` | 公开 | 只读写已发布文章下的可见评论 | 提交需要同源校验、字段校验与限流；删除只允许原作者本人 |
| `/api/comments/session` | 公开 | 只返回当前访问者的身份状态 | 访客凭证只在首次发送时签发，Cookie 为 Secure、HttpOnly、SameSite=Lax |
| `/api/admin/comments/**` | 必须调用 `requireAdmin(event)` | 可访问全部评论与审核队列 | 审核写审计日志，状态冲突返回 409 |
| `/api/posts/**`、`/api/archive` | 公开 | 文章列表和详情只返回已发布且 `publishedAt <= now` 的文章 | 公开筛选条件集中在 `buildPublishedPostWhere()`，文章对话另按登录用户或匿名会话隔离 |
| `/api/categories`、`/api/tags` | 公开 | 只统计已发布文章 | 计数口径复用公开文章筛选 |
| `/api/menus/**`、`/api/settings` | 公开 | 只返回前台展示需要的数据 | 后台编辑走 `/api/admin/**` |
| `/api/gallery/memes` | 公开 | 公开的表情包索引 | 支持按组筛选 |
| `/api/auth/**` | 按接口语义 | 登录、注册、登出、当前用户 | 登录和注册有内存级限流 |
| `/uploads/**` | 公开静态资源 | 只读取上传目录下文件 | 非 JSON API，保留普通文件 404 |

## 评论接口边界

| 接口 | 权限 | 可见性口径 |
| --- | --- | --- |
| `GET /api/posts/[slug]/comments` | 公开 | 主评论只返回可见的，以及还有可见回复的删除占位。回复预览固定正序前两条 |
| `GET /api/posts/[slug]/comments/[id]/replies` | 公开 | 固定正序。游标带版本、排序、文章 ID 与线程根 ID，任一不匹配返回 400 |
| `POST /api/posts/[slug]/comments` | 公开 | 账号身份直接可见；访客身份一律进待审 |
| `DELETE /api/posts/[slug]/comments/[id]` | 原作者本人 | 软删除并清空正文，重复删除返回成功。非本人一律 404，不区分不存在与无权限 |
| `POST /api/comments/session` | 公开 | 只返回账号状态与访客凭证是否有效，不返回任何评论数据 |
| `GET /api/admin/comments` | 管理员 | 可按状态、文章、作者昵称与时间范围筛选 |
| `PUT /api/admin/comments/[id]` | 管理员 | `expectedStatus` 与当前状态不一致返回 409；目标状态与当前相同返回成功且不写审计日志 |
| `GET /api/admin/comments/stats` | 管理员 | 队列计数，可带 `postId` 只统计单篇文章 |

公开响应不包含私有字段。被回复对象隐藏或删除时，回复只返回「回复的评论不可见」，不返回目标作者与正文。旧评论的作者一律是 `LEGACY`，不关联任何账号，也不显示官方标识。

分页使用 `(createdAt, id)` 的键集游标，不用偏移量。同一时间戳的记录既不重也不漏。

## 公开缓存策略

- 公开文章、taxonomy、菜单、设置和公开 meme 索引通过 `server/utils/cache-control.ts` 设置短 `Cache-Control`。
- 后台、认证和 AI 接口不设置公共缓存。
- 详细分组和后续升级路径见 `docs/content-cache-strategy.md`。

## 安全策略入口

- 角色、登录限流、注册限流和 AI 额度常量集中在 `server/services/security/security-policy.ts`。
- 鉴权 helper 实现在 `server/services/security/access-control.service.ts`，`server/utils/auth.ts` 保留兼容 re-export。
- 通用 fixed-window 限流工具在 `server/services/security/rate-limit.service.ts`。
- 详细策略和新增接口检查项见 `docs/security-policy.md`。

## 当前核查结果

- `/api/admin/**`：已核查，所有现有 handler 均调用 `requireAdmin(event)`。
- `/api/ai/**`：已核查，所有现有 handler 均通过 `withAiUsage()`；语义搜索也计入 `semantic-search` 使用记录。
- `/api/admin/ai/**`：已核查，所有现有 handler 均调用 `requireAdmin(event)`。
- `/api/posts/**`：已核查，列表和详情均通过 `post-query.service.ts` 的公开查询入口。
- `/api/search`：当前复用 `/api/posts` 公开列表 handler，遵守公开文章口径。
- `/api/posts/[slug]/comments/**`：已核查，公开读写共用同一套可见性判定，删除只认原作者凭证。
- `/api/admin/comments/**`：已核查，三个 handler 均调用 `requireAdmin(event)`。

## 新增接口检查清单

- 新增 `/api/admin/**` 时，handler 顶部必须先 `await requireAdmin(event)`。
- 新增 `/api/ai/**` 时，业务逻辑必须放进 `withAiUsage(event, feature, handler)`；不要在鉴权/额度检查前读取文章详情。
- 新增限流策略时，优先复用 `server/services/security/rate-limit.service.ts`，策略常量放入 `server/services/security/security-policy.ts`。
- 新增公开文章查询时，必须复用 `buildPublishedPostWhere()` 或 `post-query.service.ts` 的公开查询函数。
- 新增评论相关接口时，可见性判定必须复用 `server/services/comments/comment-query.service.ts`，不要另写一套状态过滤。
- 新增公开内容接口时，必须对照 `docs/content-cache-strategy.md` 选择缓存策略或明确 no-store。
- 新增错误时，优先使用 `server/utils/api-error.ts` 的 helper，不直接散落 `createError()`。
- 新增响应类型时，优先放到 `types/dto/*`，通用 envelope 放在 `types/api.ts`。
