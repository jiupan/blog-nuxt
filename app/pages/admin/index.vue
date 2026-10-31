<template>
  <div class="workspace-page dashboard-page">
    <div
      v-if="overviewError || postsError || userError"
      class="workspace-error"
      role="alert"
    >
      <span>部分数据加载失败，请重试。暂不可用的数据以“—”显示。</span>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        @click="retry"
      >
        重新加载
      </UButton>
    </div>

    <section
      class="dashboard-metrics"
      aria-label="站点概览"
    >
      <NuxtLink
        to="/admin/posts?status=PUBLISHED"
        class="dashboard-metric"
      >
        <span>
          <UIcon name="i-lucide-book-open" />
          已发布文章
        </span>
        <strong>{{ metric(overview?.published) }}</strong>
        <small>已与读者分享的内容</small>
      </NuxtLink>
      <NuxtLink
        to="/admin/posts?status=DRAFT"
        class="dashboard-metric"
      >
        <span>
          <UIcon name="i-lucide-file-pen-line" />
          草稿
        </span>
        <strong>{{ metric(overview?.drafts) }}</strong>
        <small>
          等待完成的想法
          <UIcon name="i-lucide-arrow-up-right" />
        </small>
      </NuxtLink>
      <div class="dashboard-metric">
        <span>
          <UIcon name="i-lucide-eye" />
          累计浏览
        </span>
        <strong>{{ metric(overview?.views) }}</strong>
        <small>全部文章累计浏览次数</small>
      </div>
      <NuxtLink
        to="/admin/users"
        class="dashboard-metric"
      >
        <span>
          <UIcon name="i-lucide-users" />
          站点用户
        </span>
        <strong>{{ metric(users?.total) }}</strong>
        <small>{{ users ? `本月新增 ${users.newThisMonth} 位` : '用户数据暂不可用' }}</small>
      </NuxtLink>
    </section>

    <div class="dashboard-columns">
      <section class="workspace-panel dashboard-recent">
        <header class="workspace-panel-heading">
          <div>
            <h2>最近编辑</h2>
            <p>从上一次停下的地方继续。</p>
          </div>
          <NuxtLink
            to="/admin/posts"
            class="workspace-text-link"
          >
            全部文章
            <UIcon
              name="i-lucide-chevron-right"
              class="size-3.5"
            />
          </NuxtLink>
        </header>
        <div
          v-if="postsPending"
          class="workspace-loading"
          role="status"
          aria-label="正在加载文章"
        >
          <span
            v-for="i in 6"
            :key="i"
          />
        </div>
        <div
          v-else-if="postsError"
          class="workspace-empty"
        >
          <UIcon name="i-lucide-wifi-off" />
          <h3>文章暂时无法加载</h3>
          <UButton
            color="neutral"
            variant="outline"
            @click="refreshPosts()"
          >
            重试
          </UButton>
        </div>
        <template v-else-if="posts.length">
          <div class="dashboard-list-label">
            <span>文章</span>
            <span>状态</span>
            <span>最近更新</span>
            <span />
          </div>
          <article
            v-for="post in posts"
            :key="post.id"
            class="dashboard-post"
          >
            <div class="dashboard-post-copy">
              <NuxtLink :to="`/admin/posts/${post.id}`">{{ post.title }}</NuxtLink>
              <span>
                {{ post.category?.name || '未分类' }}
                <span class="dashboard-copy-dot" />
                {{ metric(post.viewCount || 0) }} 次浏览
              </span>
            </div>
            <span
              class="workspace-status"
              :class="statusClass(post.status)"
            >
              {{ statusText(post.status) }}
            </span>
            <time :datetime="new Date(post.updatedAt).toISOString()">{{ formatDate(post.updatedAt) }}</time>
            <UButton
              :to="`/admin/posts/${post.id}`"
              color="neutral"
              variant="ghost"
              icon="i-lucide-square-pen"
              size="sm"
              :aria-label="`编辑 ${post.title}`"
            />
          </article>
          <div class="dashboard-list-footer">
            <span>按最后更新时间排序</span>
            <span>共 {{ metric(overview?.total) }} 篇文章</span>
          </div>
        </template>
        <div
          v-else
          class="workspace-empty"
        >
          <UIcon name="i-lucide-notebook-pen" />
          <h3>从第一篇文章开始</h3>
          <p>把一个想法写下来，保存为草稿，准备好后再发布。</p>
          <UButton
            to="/admin/posts/create"
            variant="soft"
            icon="i-lucide-plus"
          >
            新建文章
          </UButton>
        </div>
      </section>

      <aside class="dashboard-aside">
        <section class="workspace-panel dashboard-drafts">
          <header class="workspace-panel-heading">
            <h2>
              继续写作
              <span
                v-if="overview?.drafts"
                class="dashboard-small-count"
              >
                {{ overview.drafts }}
              </span>
            </h2>
            <UIcon
              name="i-lucide-file-pen-line"
              class="size-4 text-[var(--admin-muted)]"
            />
          </header>
          <div
            v-if="draftError"
            class="dashboard-quiet-state"
          >
            草稿加载失败。
            <button
              type="button"
              @click="refreshDrafts()"
            >
              重试
            </button>
          </div>
          <NuxtLink
            v-for="post in drafts"
            v-else
            :key="post.id"
            :to="`/admin/posts/${post.id}`"
            class="dashboard-draft"
          >
            <span>
              <strong>{{ post.title }}</strong>
              <small>{{ formatDate(post.updatedAt) }} 更新</small>
            </span>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-4"
            />
          </NuxtLink>
          <div
            v-if="!draftError && !drafts.length"
            class="dashboard-quiet-state"
          >
            {{ draftPending ? '正在加载草稿…' : '暂时没有未完成的草稿。' }}
          </div>
          <NuxtLink
            to="/admin/posts/create"
            class="dashboard-new-draft"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            记录一个新想法
          </NuxtLink>
        </section>

        <section
          v-if="knowledgeError || actionableCount"
          class="workspace-panel"
        >
          <header class="workspace-panel-heading">
            <h2>需要处理</h2>
            <span
              v-if="actionableCount"
              class="dashboard-attention-count"
            >
              {{ actionableCount }}
            </span>
          </header>
          <div
            v-if="knowledgeError"
            class="dashboard-quiet-state"
          >
            知识库状态加载失败。
            <button
              type="button"
              @click="refreshKnowledge()"
            >
              重试
            </button>
          </div>
          <NuxtLink
            v-if="knowledge?.stats.failed"
            to="/admin/knowledge?tab=jobs"
            class="dashboard-task"
          >
            <span class="dashboard-task-dot is-error" />
            <span>
              <strong>{{ knowledge.stats.failed }} 项知识同步失败</strong>
              <small>查看原因并重新同步</small>
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4"
            />
          </NuxtLink>
          <NuxtLink
            v-if="knowledge?.stats.pending"
            to="/admin/knowledge?tab=content"
            class="dashboard-task"
          >
            <span class="dashboard-task-dot" />
            <span>
              <strong>{{ knowledge.stats.pending }} 项知识待同步</strong>
              <small>检查索引状态与任务进度</small>
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-4"
            />
          </NuxtLink>
        </section>

        <section
          v-if="overview"
          class="workspace-panel dashboard-distribution"
        >
          <header class="workspace-panel-heading">
            <h2>内容分布</h2>
            <span class="dashboard-total">{{ overview.total }} 篇</span>
          </header>
          <div class="dashboard-distribution-body">
            <div
              class="dashboard-distribution-bar"
              role="img"
              :aria-label="`已发布 ${overview.published}，草稿 ${overview.drafts}，回收站 ${overview.archived}`"
            >
              <span
                v-for="item in distribution"
                :key="item.label"
                :class="item.tone"
                :style="{ flex: item.count }"
              />
            </div>
            <div
              v-for="item in distribution"
              :key="item.label"
              class="dashboard-distribution-row"
            >
              <span :class="item.tone" />
              <span>{{ item.label }}</span>
              <strong>{{ item.count }}</strong>
            </div>
          </div>
          <div class="dashboard-ai-note">
            <UIcon
              name="i-lucide-sparkles"
              class="size-3.5"
            />
            本月 AI 调用
            <span>{{ metric(users?.aiUsageThisMonth) }} 次</span>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminPostListItem, AdminPostListPayload, AdminPostOverview } from '~~/types/dto/post'
import type { KnowledgeOverview } from '~~/types/dto/knowledge'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
type UserOverview = { total: number; newThisMonth: number; aiUsageThisMonth: number }
const {
  data: overviewData,
  error: overviewError,
  refresh: refreshOverview
} = await useFetch<{ data: AdminPostOverview }>('/api/admin/posts/overview')
const {
  data: postData,
  pending: postsPending,
  error: postsError,
  refresh: refreshPosts
} = await useFetch<{ data: AdminPostListPayload }>('/api/admin/posts', {
  query: { page: 1, pageSize: 8, sort: 'updatedAt_desc' }
})
const {
  data: draftData,
  pending: draftPending,
  error: draftError,
  refresh: refreshDrafts
} = await useFetch<{ data: AdminPostListPayload }>('/api/admin/posts', {
  query: { page: 1, pageSize: 3, status: 'DRAFT', sort: 'updatedAt_desc' }
})
const {
  data: userData,
  error: userError,
  refresh: refreshUsers
} = await useFetch<{ data: UserOverview }>('/api/admin/users/overview')
const {
  data: knowledgeData,
  error: knowledgeError,
  refresh: refreshKnowledge
} = await useFetch<{ data: KnowledgeOverview }>('/api/admin/knowledge/overview')
const overview = computed(() => overviewData.value?.data)
const users = computed(() => userData.value?.data)
const posts = computed<AdminPostListItem[]>(() => postData.value?.data.items || [])
const drafts = computed(() => draftData.value?.data.items || [])
const knowledge = computed(() => knowledgeData.value?.data)
const actionableCount = computed(
  () => (knowledge.value?.stats.failed || 0) + (knowledge.value?.stats.pending || 0)
)
const distribution = computed(() => [
  { label: '已发布', count: overview.value?.published || 0, tone: 'is-published' },
  { label: '草稿', count: overview.value?.drafts || 0, tone: 'is-draft' },
  { label: '回收站', count: overview.value?.archived || 0, tone: 'is-archived' }
])
async function retry() {
  await Promise.all([refreshOverview(), refreshPosts(), refreshDrafts(), refreshUsers(), refreshKnowledge()])
}
function metric(value?: number) {
  return value === undefined ? '—' : new Intl.NumberFormat('zh-CN').format(value)
}
function statusClass(status: string) {
  return status === 'PUBLISHED' ? 'is-published' : status === 'DRAFT' ? 'is-draft' : 'is-archived'
}
function statusText(status: string) {
  return status === 'PUBLISHED' ? '已发布' : status === 'DRAFT' ? '草稿' : '回收站'
}
function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 26px 8px;
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #fff;
}
.dashboard-metric {
  display: grid;
  gap: 13px;
  padding: 0 24px;
  border-right: 1px solid var(--admin-line);
}
.dashboard-metric:last-child {
  border: 0;
}
.dashboard-metric > span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--admin-muted);
  font-size: 12px;
}
.dashboard-metric > span .iconify {
  width: 15px;
  height: 15px;
  color: #8b83a3;
}
.dashboard-metric strong {
  font-size: 31px;
  line-height: 1.1;
  font-weight: 550;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.dashboard-metric small {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #697386;
  font-size: 11px;
}
.dashboard-metric small .iconify {
  width: 12px;
  height: 12px;
}
a.dashboard-metric:hover strong {
  color: var(--admin-accent);
}
.dashboard-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 284px;
  align-items: start;
  gap: 24px;
}
.dashboard-list-label,
.dashboard-post {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 75px 65px 28px;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
}
.dashboard-list-label {
  min-height: 36px;
  background: #fafbfc;
  border-block: 1px solid #eef0f3;
  color: #697386;
  font-size: 11px;
}
.dashboard-post {
  min-height: 83px;
  border-bottom: 1px solid #eef0f3;
}
.dashboard-post:hover {
  background: #faf9fc;
}
.dashboard-post-copy {
  min-width: 0;
}
.dashboard-post-copy > a {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
}
.dashboard-post-copy > a:hover {
  color: var(--admin-accent);
}
.dashboard-post-copy > span {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  color: #697386;
  font-size: 11px;
}
.dashboard-copy-dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #b3b8c3;
}
.dashboard-post time {
  color: #697386;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.dashboard-list-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  color: #697386;
  font-size: 11px;
}
.dashboard-aside {
  display: grid;
  gap: 20px;
}
.dashboard-small-count {
  margin-left: 8px;
  color: #8d849f;
  font-size: 11px;
  font-weight: 450;
}
.dashboard-draft {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px 20px;
}
.dashboard-draft > span {
  flex: 1;
  min-width: 0;
}
.dashboard-draft strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.8;
}
.dashboard-draft small {
  display: block;
  margin-top: 5px;
  color: #697386;
  font-size: 11px;
}
.dashboard-draft > .iconify {
  flex: 0 0 auto;
  color: #9a91b0;
}
.dashboard-draft:hover strong {
  color: var(--admin-accent);
}
.dashboard-new-draft {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 45px;
  border-top: 1px solid var(--admin-line);
  color: var(--admin-accent);
  font-size: 11px;
  background: #fcfbfe;
}
.dashboard-quiet-state {
  padding: 0 24px 22px;
  color: #697386;
  font-size: 12px;
  line-height: 1.8;
}
.dashboard-quiet-state button {
  color: var(--admin-accent);
  cursor: pointer;
}
.dashboard-attention-count {
  display: grid;
  width: 21px;
  height: 21px;
  place-items: center;
  border-radius: 5px;
  background: #faf0e2;
  color: #956b2c;
  font-size: 11px;
}
.dashboard-task {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 24px 22px;
}
.dashboard-task > span:nth-child(2) {
  flex: 1;
}
.dashboard-task strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.dashboard-task small {
  display: block;
  margin-top: 6px;
  color: #697386;
  font-size: 11px;
}
.dashboard-task > .iconify {
  color: #a0a6b1;
}
.dashboard-task-dot {
  width: 6px;
  height: 6px;
  margin-top: 6px;
  border-radius: 50%;
  background: #c19c63;
}
.dashboard-task-dot.is-error {
  background: #be7777;
}
.dashboard-total {
  color: #697386;
  font-size: 11px;
}
.dashboard-distribution-body {
  padding: 0 24px 20px;
}
.dashboard-distribution-bar {
  display: flex;
  height: 6px;
  gap: 3px;
  overflow: hidden;
  border-radius: 4px;
  margin: 2px 0 20px;
  background: #f0f1f4;
}
.dashboard-distribution-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: var(--admin-muted);
  font-size: 11px;
}
.dashboard-distribution-row > span:first-child {
  width: 6px;
  height: 6px;
  border-radius: 2px;
}
.dashboard-distribution-row strong {
  margin-left: auto;
  color: var(--admin-ink);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.dashboard-distribution :is(.is-published) {
  background: #8a7bb9;
}
.dashboard-distribution :is(.is-draft) {
  background: #d4bf98;
}
.dashboard-distribution :is(.is-archived) {
  background: #dce0e7;
}
.dashboard-ai-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 15px 24px;
  border-top: 1px solid var(--admin-line);
  color: #697386;
  font-size: 11px;
}
.dashboard-ai-note span {
  margin-left: auto;
  color: #596273;
}
@media (min-width: 1600px) {
  .dashboard-columns {
    grid-template-columns: minmax(0, 1fr) 310px;
  }
  .dashboard-post {
    min-height: 88px;
  }
}
@media (max-width: 1150px) {
  .dashboard-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .dashboard-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
  .dashboard-metric {
    padding: 0 18px;
  }
}
@media (max-width: 640px) {
  .dashboard-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 16px;
  }
  .dashboard-metric {
    gap: 12px;
    padding: 21px 6px;
  }
  .dashboard-metric:nth-child(2) {
    border-right: 0;
    padding-left: 20px;
  }
  .dashboard-metric:nth-child(n + 3) {
    border-top: 1px solid var(--admin-line);
  }
  .dashboard-metric:last-child {
    padding-left: 20px;
  }
  .dashboard-metric strong {
    font-size: 28px;
  }
  .dashboard-metric small {
    font-size: 9px;
  }
  .dashboard-aside {
    grid-template-columns: 1fr;
  }
  .dashboard-list-label,
  .dashboard-post {
    grid-template-columns: minmax(0, 1fr) 65px 26px;
    gap: 10px;
    padding-inline: 16px;
  }
  .dashboard-post time,
  .dashboard-list-label > span:nth-child(3) {
    display: none;
  }
  .dashboard-post {
    min-height: 88px;
  }
  .dashboard-list-footer {
    padding-inline: 16px;
  }
}
</style>
