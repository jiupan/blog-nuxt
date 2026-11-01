# 本地 Agent 发布接口

本地 Agent 负责搜索、阅读、核实来源和撰稿；博客服务端只负责鉴权、校验和保存文章。不依赖浏览器登录，不执行服务器定时采编。

## 配置

1. 部署包含 `20261101090000_add_agent_publishing` 的数据库迁移。现有 `deploy.sh` 会执行 `prisma migrate deploy`；本地可使用 `npx prisma migrate deploy`。
2. 管理员进入「Agent 接入 → 发布密钥」创建密钥。完整密钥仅创建时返回一次，数据库只存 SHA-256 摘要。
3. 在本地设置 `BLOG_BASE_URL`（例如 `https://blog.ittx.cn`）和 `BLOG_AGENT_TOKEN`。不要把密钥写入文章、仓库或公开的 Skill 文件。

两条接口均使用 `Authorization: Bearer <BLOG_AGENT_TOKEN>`。密钥仅支持读取分类标签和创建文章，不能用于 `/api/admin/**`，也不能编辑、删除或置顶文章。密钥停用、创建者账号被停用或不再是管理员时，调用失效。每个密钥每个应用进程最多 60 次请求/分钟，超限返回 429 和 `Retry-After`。

## 获取分类与标签

```bash
curl "$BLOG_BASE_URL/api/agent/taxonomies" \
  -H "Authorization: Bearer $BLOG_AGENT_TOKEN"
```

响应：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "categories": [{ "id": 1, "name": "AI 与实践", "slug": "ai" }],
    "tags": [{ "id": 2, "name": "AI", "slug": "ai" }]
  }
}
```

## 创建文章

把请求保存为 UTF-8 编码的 `article.json`：

```json
{
  "requestId": "ai-news-2026-11-01-topic-01",
  "title": "一篇 AI 技术解读",
  "content": "## 发生了什么\n\n正文。\n\n## 参考资料\n\n[原始资料](https://example.com/article)",
  "summary": "文章摘要",
  "categoryId": 1,
  "tagIds": [2],
  "status": "DRAFT",
  "sources": [{ "title": "原始资料", "url": "https://example.com/article" }]
}
```

```bash
curl "$BLOG_BASE_URL/api/agent/posts" \
  -H "Authorization: Bearer $BLOG_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @article.json
```

PowerShell 可调用 `curl.exe`。也可直接使用：

```powershell
$headers = @{ Authorization = "Bearer $env:BLOG_AGENT_TOKEN" }
$body = [System.IO.File]::ReadAllText((Resolve-Path article.json))
Invoke-RestMethod -Method Post -Uri "$env:BLOG_BASE_URL/api/agent/posts" `
  -Headers $headers -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

必填：`requestId`、`title`、`content`。标题最多 200 字符，正文最多 200,000 字符。`requestId` 最多 120 字符，仅允许字母、数字、下划线、点、冒号和连字符。

可选字段：

| 字段 | 规则 |
| --- | --- |
| `status` | `DRAFT` 或 `PUBLISHED`；省略为草稿。明确要求直接发布时传 `PUBLISHED` |
| `categoryId` | 已有分类 ID，省略或 `null` 表示无分类 |
| `tagIds` | 已有标签 ID，最多 30 项；不自动创建分类或标签 |
| `slug` | 自定义访问别名，服务器会规范化；省略自动生成 |
| `summary` | 最多 2000 字符 |
| `cover` | HTTP/HTTPS 图片地址或站内 `/uploads/` 地址；省略沿用图库随机封面 |
| `seoTitle` / `seoDescription` | 最多 200 / 500 字符 |
| `sources` | 最多 20 个 `{ title, url }`；只接受不含登录凭证的 HTTP/HTTPS 地址 |

来源用于后台追溯，不会自动追加到正文。需要公开展示的参考链接请写在 Markdown 正文中；服务端不会抓取或验证来源网页的内容。请求体最大 1 MiB。

新建成功返回 HTTP 201：

```json
{
  "code": 0,
  "message": "文章已创建",
  "data": {
    "requestId": "ai-news-2026-11-01-topic-01",
    "replayed": false,
    "post": {
      "id": 123,
      "title": "一篇 AI 技术解读",
      "slug": "abc12345",
      "status": "DRAFT",
      "publishedAt": null,
      "path": null,
      "url": null,
      "editPath": "/admin/posts/123",
      "editUrl": "https://blog.ittx.cn/admin/posts/123"
    }
  }
}
```

草稿的 `publishedAt`、`path`、`url` 为 `null`。传入 `PUBLISHED` 时返回发布时间和公开地址，例如 `/abc12345.html`。编辑地址需要管理员登录；不能把它当作公开文章地址。文章发布后的知识库同步沿用现有设置。

## 重试与排错

- 为每篇新文章生成一个新的 `requestId`。网络断开、超时或 5xx 时，保留编号和完整请求内容再重试。
- 同一密钥、同一编号、相同内容重试返回 HTTP 200，`replayed: true`，复用已创建文章。
- 同一编号提交不同内容返回 409。修改草稿应在后台进行；接口第一版只支持创建，不支持用同一编号把草稿变为发布状态。
- 文章和成功记录在同一数据库事务提交，并发请求不会各自创建一篇文章。文章被管理员删除后，重试原编号返回 409，不会把它重新创建。
- 401：检查密钥、停用状态及创建者权限。400：检查字段和分类标签是否仍存在。429：按照 `Retry-After` 等待；409：先读错误说明，不要自动换编号绕过冲突。
- 后台「发布记录」显示通过鉴权与格式校验后、进入发布流程的执行结果。无效密钥、格式不合法和冲突请求不会覆盖已有发布记录；记录不保存完整密钥或文章全文。
