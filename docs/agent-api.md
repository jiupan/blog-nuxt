# 本地 Agent 发布接口

本地 Agent 负责搜索、阅读、核实来源和撰稿；博客服务端负责鉴权、校验、上传图片和保存文章。不依赖浏览器登录，不执行服务器定时采编。

## 配置

1. 部署包含 `20261101090000_add_agent_publishing` 的数据库迁移。现有 `deploy.sh` 会执行 `prisma migrate deploy`；本地可使用 `npx prisma migrate deploy`。
2. 管理员进入「Agent 接入 → 发布密钥」创建密钥，也可在列表再次复制。数据库保存 SHA-256 摘要及 AES-256-GCM 加密副本，不保存明文。复制操作要求管理员登录，并记录操作审计。
3. 在本地设置 `BLOG_BASE_URL`（例如 `https://blog.ittx.cn`）和 `BLOG_AGENT_TOKEN`。不要把密钥写入文章、仓库或公开的 Skill 文件。

以下接口均使用 `Authorization: Bearer <BLOG_AGENT_TOKEN>`。密钥支持读取分类标签、上传图片和创建文章，不能用于 `/api/admin/**`，也不能编辑、删除或置顶文章。密钥停用、创建者账号被停用或不再是管理员时，调用失效。每个密钥每个应用进程最多 60 次请求/分钟，超限返回 429 和 `Retry-After`。

密钥加密默认从服务器 `NUXT_SESSION_PASSWORD` 派生，也可配置至少 32 字节的 `AGENT_TOKEN_ENCRYPTION_KEY`。请保持加密配置稳定；改变它后，旧密钥仍可鉴权，但旧副本不能解密复制。旧版只有哈希的密钥，在客户端下一次携带原文正常调用时会补存加密副本；原文已丢失且从未补存的密钥无法恢复，需要新建。新增迁移 `20261101130000_add_recoverable_agent_keys` 由部署脚本自动执行。

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
    "tags": [{ "id": 2, "name": "AI", "slug": "ai" }],
    "capabilities": { "tagNames": true }
  }
}
```

## 创建文章

使用 `tagNames` 前，先确认分类标签接口返回 `data.capabilities.tagNames: true`。同名标签会复用，新增标签与文章在同一事务中保存。分类通过已有 ID 选择。

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
| `tagIds` | 已有标签 ID，最多 30 项，服务端去重 |
| `tagNames` | 可选，最多 3 个标签名称，每个去掉首尾空白后 1～40 字符且可生成别名。已有同名标签会复用（忽略大小写），其余随文章一同创建。与 `tagIds` 合计最多 30 项 |
| `slug` | 自定义访问别名，服务器会规范化；省略自动生成 |
| `summary` | 最多 2000 字符 |
| `cover` | HTTP/HTTPS 图片地址或站内 `/uploads/` 地址；省略沿用图库随机封面 |
| `seoTitle` / `seoDescription` | 最多 200 / 500 字符 |
| `sources` | 最多 20 个 `{ title, url }`；只接受不含登录凭证的 HTTP/HTTPS 地址 |

来源用于后台追溯，不会自动追加到正文。需要公开展示的参考链接请写在 Markdown 正文中；服务端不会抓取或验证来源网页的内容。创建文章请求体最大 1 MiB。

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

## 上传本地图片

`POST /api/agent/images?purpose=image` 上传正文图片，`purpose=cover` 上传封面。省略用途默认为 `image`；不接受头像、表情包或 favicon 用途。

```bash
curl "$BLOG_BASE_URL/api/agent/images?purpose=image" \
  -H "Authorization: Bearer $BLOG_AGENT_TOKEN" \
  -F "file=@diagram.png"
```

请求必须是 `multipart/form-data`，只包含一个名为 `file` 的文件字段。不要手动设置 multipart 的 `Content-Type`，由客户端生成 boundary。每次一张 JPG、PNG 或 WebP，原图最大 50 MiB、最多 4000 万像素；服务器校验真实格式，自动旋转并压缩为最大宽度 1600 的 WebP，小图不放大。代理层需允许至少 51 MiB 的 multipart 请求体。

返回 HTTP 200：

```json
{
  "code": 0,
  "message": "图片已存入图库",
  "data": {
    "url": "/uploads/2026/11/diagram-<内容哈希>.webp",
    "absoluteUrl": "https://blog.ittx.cn/uploads/2026/11/diagram-<内容哈希>.webp",
    "mediaType": "image",
    "originalName": "diagram.png",
    "collection": "images"
  }
}
```

使用真实返回的 `url` 填写 `cover`，或写入正文 `![图片说明](返回的url)`。中文文件名对应地址会进行 URL 编码。不要把本地磁盘路径或 Base64 放进正文；外链可能受 CSP 和防盗链限制，站内图片可直接展示。

上传的图片自动进入现有「图库 → 普通图片／封面」，文件名保留可搜索的原名称前缀，后接处理后内容的哈希。同一个月份、同用途、同文件名且处理后内容相同的上传复用地址，不覆盖已有图片；跨月可能生成新地址。创建文章失败不会自动删除已上传图片，可在图库中后续管理。

## 重试与排错

- 为每篇新文章生成一个新的 `requestId`。网络断开、超时或 5xx 时，保留编号和完整请求内容再重试。
- 同一密钥、同一编号、相同内容重试返回 HTTP 200，`replayed: true`，复用已创建文章。
- 同一编号提交不同内容返回 409。修改草稿应在后台进行；接口第一版只支持创建，不支持用同一编号把草稿变为发布状态。
- 文章和成功记录在同一数据库事务提交，并发请求不会各自创建一篇文章。文章被管理员删除后，重试原编号返回 409，不会把它重新创建。
- 401：检查密钥、停用状态及创建者权限。400：检查字段和分类标签是否仍存在。429：按照 `Retry-After` 等待；409：先读错误说明，不要自动换编号绕过冲突。
- 后台「发布记录」显示通过鉴权与格式校验后、进入发布流程的执行结果。无效密钥、格式不合法和冲突请求不会覆盖已有发布记录；记录不保存完整密钥或文章全文。
