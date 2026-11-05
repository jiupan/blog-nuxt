# 评论系统交接说明

本文档是原生评论系统的交接记录。功能边界见 `docs/api-boundaries.md`，安全与限流策略见 `docs/security-policy.md`，导入工具用法见 `docs/comments-import.md`。

## 已交付

| 部分 | 位置 | 说明 |
| --- | --- | --- |
| 数据层 | `prisma/schema.prisma`、`prisma/migrations/20261105143000_add_native_comments/migration.sql` | `Comment` 与 `CommentRateBucket` 两张表，六条手写 CHECK 约束 |
| 契约 | `types/dto/comment.ts` | 公开、后台与提交回执的 DTO |
| 服务层 | `server/services/comments/` | 身份、受限渲染、列表与游标、幂等写入、审核、原子限流、审计 |
| 接口层 | `server/api/posts/[slug]/comments/**`、`server/api/comments/session.post.ts`、`server/api/admin/comments/**` | 公开读写与后台审核 |
| 前台 | `app/components/comment/`、`app/composables/usePostComments.ts`、`app/utils/comment.ts` | 评论区、楼中楼、编辑器、草稿与反馈 |
| 后台 | `app/pages/admin/comments.vue`、`server/api/admin/comments/stats.get.ts` | 队列筛选、单条审核、详情查看 |
| 导入工具 | `scripts/import-twikoo-comments.ts`、`scripts/lib/`、`scripts/make-comment-fixture.ts` | 试算与写入、差异报告、离线校准 |
| 旧依赖清理 | 已删除 `TwikooComment`、`TwikooManager`、`app/types/twikoo.d.ts` | npm 依赖、锁文件、Compose、deploy.sh、环境示例、CSP 与文档同步清理 |

## 数据库迁移

迁移文件：`prisma/migrations/20261105143000_add_native_comments/migration.sql`。

它做三件事：建 `Comment` 与 `CommentRateBucket` 两张表并创建枚举；给 `AdminAuditLog` 加 `commentId` 与 `postId`；手写六条 CHECK 约束。

六条约束分别是：主评论与回复的 `threadRootId`/`replyToId` 成对、禁止指向自身、身份与凭证成对、导入字段成对、幂等字段成对、原生写入与离线导入来源互斥。

约束只能手写，因为 Prisma schema 表达不了 CHECK。**应用迁移一律用 `prisma migrate deploy`。** 本地如果用 `prisma migrate dev`，它会拿 shadow 库对比，把这六条约束当成漂移并生成删除语句。删掉只是少了一层数据库侧的兜底，不破坏既有数据；要保留就把生成迁移里的 `DROP CONSTRAINT` 去掉再手动补回。

删除文章时评论随文章级联清理，审核审计记录刻意不建外键，必须比目标活得久。

## 验证记录

在本地执行，全部通过：

| 项目 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | 通过 |
| 代码检查 | `npm run lint` | 0 错误，73 个既有告警 |
| 单元测试 | `npm test` | 43 个文件、304 条用例全部通过（含新增 15 条评论回归用例） |
| 生产构建 | `npm run build` | 通过，产物里没有任何 Twikoo 引用 |
| 构建产物运行配置 | 本机临时端口启动构建产物，禁用后台 worker，使用不可连接的独立数据库地址 | 启动时追加的允许来源可建立访客会话并收到 Cookie（200），其他来源被拒绝（403）；未访问真实数据库 |
| 导入工具演练 | `npm run comments:fixture` + `npm run comments:import --offline` | 9 条夹具：可导入 6，待处理 3，问题类型与数量逐条对得上 |

## 2026-11-05 评审修复

- 修正 Twikoo 的 rid（讨论根）/pid（实际回复对象）映射及多层回复夹具。
- 评论 IP 转发头仅对显式配置的可信直连代理生效；Compose 的 3000 端口仅本机可访问。
- 评论运行配置统一使用 NUXT_COMMENT_ALLOWED_ORIGINS、NUXT_COMMENT_RATE_SECRET、NUXT_COMMENT_TRUSTED_PROXIES，配置说明见 security-policy.md。
- 所有访客提交都先建立凭证，合并并发建会话请求，失败后保留草稿并允许重试。
- 昵称纳入草稿快照；提交完成仅清理原快照，保留期间切换身份、回复对象或编辑后的草稿。
- 回复展开后可继续翻页；排序和分页请求的旧响应不能覆盖新列表。
- 新增真实 Vue 组件及上下文测试，覆盖回复分页、草稿、昵称、访客会话与请求乱序；另覆盖导入关系和代理信任边界。

## 待决项

| 事项 | 现状 | 需要什么 |
| --- | --- | --- |
| 迁移演练 | 迁移 SQL 尚未在真实 PostgreSQL 上执行过，六条 CHECK 与 Post→Comment 级联没验证过 | 一个可写的 PostgreSQL 16 实例，跑一次 `prisma migrate deploy` |
| 上游字段校准 | 字段名用的是候选映射，状态标记里刻意没有数字状态 | 一份脱敏的真实 Twikoo 备份样本与它的容器卷文件形态 |
| 导入重跑验证 | 试算链路已验证，写入链路只做过代码走查 | 独立测试库，同一夹具导入两次，第二次新增必须为零 |
| 游客删除诉求 | 访客凭证丢失后无法自助删除 | 按技术方案第一节的约定由管理员处理 |

## 上线与回退

切流分两种回退，处理方式不同：

- **切换前**：旧评论还在 Twikoo 里，直接把原生开关关掉就回到旧站。Twikoo 的容器卷与备份作为历史数据单独留存，保留周期另行决定。
- **原生已接收新评论后**：回退不能只切开关。两边已经各自有了数据，回退前要先算差额，把原生期间新增的评论导回旧站或者接受丢失，再决定是整体回退还是保留原生。

正式导入生产数据、切流、部署与线上验收不在本文件范围内，属于后续交办。
