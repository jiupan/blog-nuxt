# 认证和限流策略

本文档记录当前认证、角色判断和限流策略。目标是让新增接口时能复用明确 helper，不再把安全策略散落到 handler。

## 代码入口

| 能力 | 文件 | 说明 |
| --- | --- | --- |
| 角色和额度常量 | `server/services/security/security-policy.ts` | 集中 `USER`、`ADMIN`、登录限流、注册限流、AI 限流和每日额度 |
| 认证/鉴权 | `server/services/security/access-control.service.ts` | `requireUser(event)`、`requireAdmin(event)` |
| 兼容入口 | `server/utils/auth.ts` | re-export 鉴权 helper，旧 import 路径继续可用 |
| 固定窗口限流 | `server/services/security/rate-limit.service.ts` | 内存 fixed-window 工具、客户端 IP 获取、retry-after 计算 |
| AI 使用限制 | `server/utils/ai-usage.ts` | `withAiUsage(event, feature, handler)`，记录成功/失败/阻断日志 |
| 评论身份 | `server/services/comments/comment-identity.service.ts` | 账号回查、访客凭证签发与摘要、归属判定 |
| 评论限流 | `server/services/comments/comment-rate-limit.service.ts` | 数据库内的原子限流桶，按账号、访客凭证与 IP 分桶 |
| 同源校验 | `server/utils/origin.ts` | `assertSameOrigin(event)`，比对 Origin 与允许的站点 origin |
| 评论正文渲染 | `server/services/comments/comment-render.service.ts` | 受限 Markdown 与白名单清洗 |

## 当前策略

| 场景 | 策略 | 失败响应 |
| --- | --- | --- |
| 后台 API | `/api/admin/**` 必须调用 `requireAdmin(event)` | 401 未登录，403 非管理员 |
| 普通 AI API | `/api/ai/**` 必须通过 `withAiUsage()` | 401 未登录，429 超限 |
| 登录 | 同一 IP + 用户名，15 分钟最多 5 次验证尝试，成功登录后重置 | 429，包含 `retryAfterSeconds` |
| 登录 IP 总量 | 同一 IP 每分钟最多 30 次登录请求 | 429，包含 `retryAfterSeconds` |
| 注册 | 同一 IP，1 小时最多 5 次注册尝试 | 429 |
| AI 用户频率 | 同一用户，1 分钟最多 5 次 | 429 |
| AI IP 频率 | 同一 IP，1 小时最多 60 次 | 429 |
| AI 每日额度 | 普通用户每天 20 次成功请求，管理员不受每日额度限制 | 429 |
| 评论写入来源 | 所有浏览器写请求校验 Origin 与允许的站点 origin 精确匹配 | 403 |
| 评论账号配额 | 同一账号 1 分钟 5 条、1 小时 30 条。选访客身份时同样计入所在账户的配额 | 429，含 `Retry-After` |
| 评论访客配额 | 同一访客凭证 10 分钟 3 条、1 小时 10 条 | 429，含 `Retry-After` |
| 评论 IP 软限制 | 同一 IP 1 分钟 30 条、1 小时 120 条，HMAC 后入桶 | 429，含 `Retry-After` |
| 评论审核 | 访客身份一律进待审；只有绑定博客账号且角色为管理员的评论显示官方标识 | 提交后返回待审状态 |
| 评论删除 | 只允许原作者本人（账号 id 或访客凭证摘要匹配），软删除并清空正文 | 404，不区分不存在与无权限 |

## 实现取舍

- 当前限流是进程内 fixed-window，适合单实例或低并发自部署。各 Map 最多保留 10,000 个键，随请求定期清理过期桶。达到上限时拒绝分配新桶，已有活跃桶继续执行原配额。
- 多实例部署时，限流计数不会跨进程同步；需要升级为 Redis、数据库或边缘网关限流。
- AI 每日额度使用 `AiUsageLog` 统计成功请求，能够跨进程保持一致。
- 登录和注册限流不写数据库，避免认证入口增加额外写入成本。
- 评论限流另走数据库桶：`CommentRateBucket` 以 scope、keyHash、windowStart、windowKind 为唯一键，用 ON CONFLICT 条件更新在库内封顶，重启和多副本都绕不过去。
- 评论限流的 IP 只用服务端密钥 HMAC 后入桶。日志与报告都不记录原始 IP、Cookie、邮箱或整段正文。
- 访客凭证是 256 位随机令牌，只存摘要。生产环境 Cookie 为 Secure、HttpOnly、SameSite=Lax、Path=/ 与 Host 前缀，开发环境用独立 Cookie 名。
- 登录、注册、AI 和评论共用可信客户端 IP 规则，默认仅使用 socket 对端 IP。通过 `NUXT_COMMENT_TRUSTED_PROXIES` 显式填写直连代理的 IP/CIDR（逗号分隔）后，才接受这些代理提供的转发头；不要把任意访客网段加入可信列表。代理必须覆盖 `X-Real-IP`，或清除此头并正确追加 `X-Forwarded-For`。
- Compose 的应用端口仅绑定 `127.0.0.1:3000`，供宿主机反代访问。Docker 环境中的 socket 对端通常是网桥网关，需核实实际来源地址后配置可信代理；未配置时限流会按代理地址合并计数。若反代在其他容器中，应通过容器网络访问应用。
- 评论运行配置使用 `NUXT_COMMENT_ALLOWED_ORIGINS`、`NUXT_COMMENT_RATE_SECRET`，可在预构建镜像启动时覆盖；旧的无 `NUXT_` 前缀名称不再使用。
- 评论正文关闭原始 HTML，只走受限 Markdown，再过一遍 sanitize-html 白名单。评论里不放外链图片，头像由展示名首字生成，不请求第三方头像服务。

## 评论接口检查清单

- 新增评论写接口：先 `assertSameOrigin(event)`，再校验字段，再进事务扣配额。
- 新增评论读接口：可见性判定复用 `comment-query.service.ts`，不要另写状态过滤。
- 新增评论状态：状态机与 CHECK 约束在 `prisma/migrations/20261105143000_add_native_comments/migration.sql`，改枚举要同时改迁移与前端类型。
- 应用迁移一律用 `prisma migrate deploy`。`prisma migrate dev` 会把 schema 表达不了的手写 CHECK 约束当成漂移并生成删除语句，保留约束就要手动改回新生成的迁移。
- 新增限流维度：在 `comment-rate-limit.service.ts` 里加桶，密钥必须 HMAC 后再入桶。
- 新增评论 DTO：放到 `types/dto/comment.ts`，公开 DTO 不带邮箱、IP、凭证与请求摘要。

## 新增接口检查清单

- 新增后台接口：handler 顶部先 `await requireAdmin(event)`，再读取或写入业务数据。
- 新增普通登录用户接口：使用 `await requireUser(event)`。
- 新增普通 AI 接口：把业务逻辑放入 `withAiUsage(event, feature, handler)`，不要在此之前读取文章详情或执行检索。
- 新增限流场景：优先复用 `rate-limit.service.ts`，限流窗口和次数放到 `security-policy.ts`。
- 新增角色：先扩展 `security-policy.ts`，再调整 `access-control.service.ts`，不要在 handler 中散落角色字符串。
