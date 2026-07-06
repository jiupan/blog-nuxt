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

## 命名和权限规则

| 路径 | 权限 | 数据边界 | 说明 |
| --- | --- | --- | --- |
| `/api/admin/**` | 必须调用 `requireAdmin(event)` | 可访问后台管理数据 | 后台页面只能作为体验层保护，服务端 `requireAdmin()` 是真正边界 |
| `/api/ai/**` | 必须通过 `withAiUsage(event, feature, handler)` | 只能读取已发布文章或公开索引 | 登录、频率限制和使用额度都由 `withAiUsage()` 处理 |
| `/api/admin/ai/**` | 必须调用 `requireAdmin(event)` | 可读取草稿、后台统计和索引状态 | 后台 AI 工具不走普通用户额度 |
| `/api/posts/**` | 公开 | 只返回已发布且 `publishedAt <= now` 的文章 | 公开筛选条件集中在 `buildPublishedPostWhere()` |
| `/api/categories`、`/api/tags` | 公开 | 只统计已发布文章 | 计数口径复用公开文章筛选 |
| `/api/menus/**`、`/api/settings` | 公开 | 只返回前台展示需要的数据 | 后台编辑走 `/api/admin/**` |
| `/api/auth/**` | 按接口语义 | 登录、注册、登出、当前用户 | 登录和注册有内存级限流 |
| `/uploads/**` | 公开静态资源 | 只读取上传目录下文件 | 非 JSON API，保留普通文件 404 |

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

## 新增接口检查清单

- 新增 `/api/admin/**` 时，handler 顶部必须先 `await requireAdmin(event)`。
- 新增 `/api/ai/**` 时，业务逻辑必须放进 `withAiUsage(event, feature, handler)`；不要在鉴权/额度检查前读取文章详情。
- 新增限流策略时，优先复用 `server/services/security/rate-limit.service.ts`，策略常量放入 `server/services/security/security-policy.ts`。
- 新增公开文章查询时，必须复用 `buildPublishedPostWhere()` 或 `post-query.service.ts` 的公开查询函数。
- 新增公开内容接口时，必须对照 `docs/content-cache-strategy.md` 选择缓存策略或明确 no-store。
- 新增错误时，优先使用 `server/utils/api-error.ts` 的 helper，不直接散落 `createError()`。
- 新增响应类型时，优先放到 `types/dto/*`，通用 envelope 放在 `types/api.ts`。
