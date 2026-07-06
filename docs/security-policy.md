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

## 当前策略

| 场景 | 策略 | 失败响应 |
| --- | --- | --- |
| 后台 API | `/api/admin/**` 必须调用 `requireAdmin(event)` | 401 未登录，403 非管理员 |
| 普通 AI API | `/api/ai/**` 必须通过 `withAiUsage()` | 401 未登录，429 超限 |
| 登录失败 | 同一 IP + 用户名，15 分钟最多 5 次失败 | 429，包含 `retryAfterSeconds` |
| 注册 | 同一 IP，1 小时最多 5 次注册尝试 | 429 |
| AI 用户频率 | 同一用户，1 分钟最多 5 次 | 429 |
| AI IP 频率 | 同一 IP，1 小时最多 60 次 | 429 |
| AI 每日额度 | 普通用户每天 20 次成功请求，管理员不受每日额度限制 | 429 |

## 实现取舍

- 当前限流是进程内 fixed-window，适合单实例或低并发自部署。
- 多实例部署时，限流计数不会跨进程同步；需要升级为 Redis、数据库或边缘网关限流。
- AI 每日额度使用 `AiUsageLog` 统计成功请求，能够跨进程保持一致。
- 登录和注册限流不写数据库，避免认证入口增加额外写入成本。

## 新增接口检查清单

- 新增后台接口：handler 顶部先 `await requireAdmin(event)`，再读取或写入业务数据。
- 新增普通登录用户接口：使用 `await requireUser(event)`。
- 新增普通 AI 接口：把业务逻辑放入 `withAiUsage(event, feature, handler)`，不要在此之前读取文章详情或执行检索。
- 新增限流场景：优先复用 `rate-limit.service.ts`，限流窗口和次数放到 `security-policy.ts`。
- 新增角色：先扩展 `security-policy.ts`，再调整 `access-control.service.ts`，不要在 handler 中散落角色字符串。
