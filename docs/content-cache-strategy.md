# 前台内容查询缓存策略

本文档记录当前公开内容接口的缓存策略。目标是降低重复请求成本，同时避免后台发布、菜单和设置更新后出现长时间旧数据。

## 当前原则

- 不使用 `defineCachedEventHandler` 缓存数据库查询结果，公开接口仍实时读 service/database。
- 只通过 `Cache-Control` 给浏览器、CDN 或反向代理提供短缓存和 `stale-while-revalidate` 建议。
- 后台接口、认证接口、AI 接口不做公共缓存。
- 文章发布、设置、菜单、分类标签更新后，最多接受分钟级公共缓存延迟。

## 代码入口

| 能力 | 文件 |
| --- | --- |
| 缓存头预设 | `server/utils/cache-control.ts` |
| 文章列表缓存 | `server/api/posts/index.get.ts` |
| 文章详情缓存 | `server/api/posts/[slug].get.ts` |
| 分类/标签缓存 | `server/api/categories/index.get.ts`、`server/api/tags/index.get.ts` |
| 菜单缓存 | `server/api/menus.get.ts`、`server/api/menus/[location].get.ts` |
| 公开设置缓存 | `server/api/settings.get.ts` |
| 公开 meme 索引缓存 | `server/api/gallery/memes.get.ts` |

## 缓存分组

| 分组 | 接口 | Cache-Control | 说明 |
| --- | --- | --- | --- |
| 公开文章列表 | `/api/posts`、`/api/search` | `public, max-age=30, s-maxage=60, stale-while-revalidate=300` | 列表受分页、分类、搜索影响，短缓存即可 |
| 公开文章详情 | `/api/posts/:slug` | `public, max-age=60, s-maxage=120, stale-while-revalidate=600` | 文章内容更新频率低于列表，但仍保持分钟级刷新 |
| 导航和配置 | `/api/categories`、`/api/tags`、`/api/menus/**`、`/api/settings` | `public, max-age=120, s-maxage=300, stale-while-revalidate=600` | 变更不频繁，允许稍长缓存 |
| 媒体索引 | `/api/gallery/memes` | `public, max-age=60, s-maxage=300, stale-while-revalidate=600` | 只缓存索引，不缓存上传文件本身 |
| 后台/认证/AI | `/api/admin/**`、`/api/auth/**`、`/api/ai/**` | 不设置公共缓存 | 包含权限、用户态、配额或后台数据 |

## 后续升级路径

- 如果部署到 CDN，可按当前 `s-maxage` 让 CDN 短缓存公开接口。
- 如果需要发布后立即刷新 CDN，应在后台写入接口增加 purge/revalidate 钩子。
- 如果数据库压力明显，再考虑对 taxonomy、menus、settings 使用 Nitro storage 或 `defineCachedEventHandler`，并配套后台更新后的主动失效。
- 多实例部署时，服务端内存缓存不作为首选；优先使用 CDN、Redis 或数据库层缓存。

## 新增公开接口检查清单

- 是否包含用户态、权限态或 AI 配额：如果包含，不允许公共缓存。
- 是否读取公开文章：必须复用公开文章查询 service，并根据实时性选择 `public-content` 或 `public-content-detail`。
- 是否是导航、配置或 taxonomy：优先使用 `public-navigation`。
- 是否是媒体索引：优先使用 `public-media-index`。
- 是否需要后台更新后立即生效：先保持 no-store 或短缓存，再评估主动失效机制。
