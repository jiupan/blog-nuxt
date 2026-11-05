# 评论导入工具

本文档记录旧评论导入工具的用法、映射文件格式与对账口径。原生评论系统的接口与权限见 `docs/api-boundaries.md`；审核与限流见 `docs/security-policy.md`。

导入工具只处理历史数据，落在 `scripts/import-twikoo-comments.ts`。原生评论的写入路径不接受导入参数，导入与线上写入互不影响。

## 命令

```bash
# 试算。只读数据库，输出报告，不写数据。这是默认行为。
npm run comments:import -- --input <备份文件> --mapping <映射文件> --dry-run --report reports/dry-run.json

# 写入。必须显式给出目标库名，且与 DATABASE_URL 里的库名一致。
npm run comments:import -- --input <备份文件> --mapping <映射文件> --apply --target <数据库名> --report reports/apply.json

# 不连数据库，只做字段映射与结构体检。校准上游字段时用。
npm run comments:import -- --input <备份文件> --mapping <映射文件> --posts <文章清单> --offline --report reports/calibrate.json
```

| 参数 | 说明 |
| --- | --- |
| `--input` | 上游备份文件。接受 JSON 数组、LokiJS 导出、Mongo 风格 `docs`、JSONL |
| `--mapping` | 映射文件。校准字段名、旧路径别名与状态标记 |
| `--posts` | 文章清单 JSON，形如 `[{"id":1,"slug":"hello","title":"…"}]`。离线演练时用 |
| `--report` | 报告输出路径，默认 `reports/comment-import-report.json` |
| `--dry-run` | 试算，默认行为 |
| `--apply` | 写入。需要同时给出 `--target` |
| `--target` | 目标数据库名，必须与 `DATABASE_URL` 里的库名一致 |
| `--offline` | 不连数据库 |
| `--allow-any-host` | 不校验来源域名 |
| `--allow-remote` | 允许写入非本机数据库。确认是独立测试库后再用 |
| `--source` | 写入的 `legacySource`，默认 `twikoo` |
| `--fail-on-issues` | 存在待处理记录时以非零码退出 |

## 映射文件

Twikoo 的 `rid` 是讨论根 ID，`pid` 是实际被回复的评论 ID。默认映射与下面示例按此口径处理；两者不同的多层回复必须保留实际回复对象。

```json
{
  "fields": {
    "sourceId": ["_id", "id"],
    "url": ["url"],
    "parentId": ["rid"],
    "replyToId": ["pid"],
    "replyToNickname": ["ruser"],
    "nickname": ["nick"],
    "body": ["comment"],
    "createdAt": ["created"],
    "likeCount": ["like"],
    "status": ["status"]
  },
  "statusMap": {
    "hidden": "HIDDEN",
    "deleted": "DELETED"
  },
  "defaultStatus": "PENDING",
  "allowedHosts": ["legacy.example.com"],
  "postAliases": {
    "archives/old-slug.html": "old-slug"
  },
  "emojiHosts": ["twikoo.example.com"]
}
```

| 字段 | 说明 |
| --- | --- |
| `fields` | 上游字段到本地字段的候选列表。写在这里的候选会追加到默认候选前面，不是替换 |
| `statusMap` | 状态标记到 `VISIBLE` / `HIDDEN` / `DELETED` / `PENDING` 的映射 |
| `defaultStatus` | 状态无法判定时的兜底，默认 `PENDING` |
| `allowedHosts` | 可信站点域名。旧 URL 的域名不在表内就不导入。会并上 `SITE_URL` 的域名 |
| `postAliases` | 旧路径或旧 slug 到当前 slug 的人工映射 |
| `emojiHosts` | 表情图来源域名。命中时按表情单独计数 |

默认状态映射里**刻意没有数字状态**。数字的含义必须先用样本确认，猜错会把该隐藏的评论公开出去。确认之后在 `statusMap` 里补一条即可，例如 `"0": "VISIBLE"`。

状态无法判定时一律落到 `defaultStatus`，不会自动变成可见。

## 导入规则

| 环节 | 规则 |
| --- | --- |
| 归属 | 旧 URL 先取路径，再取最后一段与去掉 `.html` 的形式，归一化后匹配 `Post.slug`。命中别名表时优先用别名 |
| 身份 | 导入的评论作者一律是 `LEGACY`，不关联任何现有账号，也不发访客凭证 |
| 正文 | 旧 HTML 重新过白名单。图片与表情转成指向原地址的链接，不抓取任何远端资源，转换条数单独记账 |
| 昵称 | 原样保留。缺失时用「匿名」，超过 24 个字符时截断 |
| 点赞 | 字段缺失时留 `null`，不补 0。`null` 表示历史点赞数未知 |
| 时间 | 保留原始时间。解析不了的记录待处理 |
| 状态 | 只认映射表里明确命中的标记，其余落到 `defaultStatus` |
| 父子 | 先导主评论，再按依赖接回复。缺根、跨文章父子与成环都待处理 |
| 回复对象 | 被回复对象缺失或跨文章时退回线程根，保证回复始终有明确的引用对象 |
| 幂等 | `legacySource` 与 `legacyId` 组成联合唯一键，重跑不会重复插入 |
| 差异 | 已导入且内容一致的跳过；不一致的只报告不覆盖，避免冲掉后台已审核的状态 |

## 报告口径

报告按文章输出原始记录数、可导入数、新增数、跳过数、状态分布、主评论数、回复数、无法归属数、媒体转换数和父子异常数。

| 汇总项 | 含义 |
| --- | --- |
| `sourceRecords` | 输入里的原始记录数 |
| `importable` | 进入计划的记录数 |
| `unassignable` | 没能进入计划的记录数。每条都有一条阻断问题，差额因此能逐条对上 |
| `unresolvedPost` | 没能归属到文章的记录数 |
| `parentChildAnomalies` | 缺根、跨文章父子与成环的数量 |
| `mediaConversions` | 图片与表情的转换条数 |

报告只写稳定 ID、问题类型和数量。邮箱、IP、Cookie 与正文一律不进去；需要核对内容时用正文摘要。

## 演练

```bash
# 造一份人工构造的夹具，覆盖中文 slug、旧路径、父子关系、隐藏、删除与异常引用
npm run comments:fixture -- fixtures/twikoo-comments.sample.json

# 离线跑一遍，看字段映射与结构
npm run comments:import -- --input fixtures/twikoo-comments.sample.json \
  --mapping fixtures/mapping.sample.json --posts fixtures/posts.sample.json \
  --offline --report reports/fixture.json
```

真实备份与其中的配置、邮箱、IP、凭证一律留在仓库外。开发阶段只用脱敏小样或人工夹具。
