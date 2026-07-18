<template>
  <div class="dashboard-page">
    <section class="dashboard-hero">
      <div class="dashboard-title">
        <span class="dashboard-title-icon">
          <UIcon name="i-lucide-layout-dashboard" class="size-6" />
        </span>
        <span>
          <h1>仪表盘</h1>
          <p>欢迎回来，这是你的博客数据概览。</p>
        </span>
      </div>

      <div class="dashboard-hero-actions">
        <UInput
          v-model="searchText"
          icon="i-lucide-search"
          placeholder="搜索文章..."
          class="dashboard-search"
          @keyup.enter="goSearch"
        />
        <UButton icon="i-lucide-plus" to="/admin/posts/create">写文章</UButton>
      </div>
    </section>

    <section class="dashboard-stats">
      <article v-for="stat in statCards" :key="stat.title" class="dashboard-stat-card">
        <div class="dashboard-stat-top">
          <span class="dashboard-stat-icon" :class="stat.iconClass">
            <UIcon :name="stat.icon" class="size-6" />
          </span>
          <span class="dashboard-trend" :class="stat.trendClass">
            <UIcon :name="stat.trendIcon" class="size-4" />
            {{ stat.trend }}
          </span>
        </div>
        <div>
          <h2>{{ stat.title }}</h2>
          <strong>{{ stat.value }}</strong>
          <p>{{ stat.hint }}</p>
        </div>
      </article>
    </section>

    <div class="dashboard-grid">
      <section class="dashboard-panel dashboard-recent">
        <div class="dashboard-panel-head">
          <div>
            <h2>近期发布的文章</h2>
            <p>管理最近撰写和更新的内容</p>
          </div>
          <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" to="/admin/posts">
            查看全部
          </UButton>
        </div>

        <div v-if="posts.length" class="dashboard-table-wrap">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>文章标题</th>
                <th>分类</th>
                <th>状态</th>
                <th>浏览量</th>
                <th>更新时间</th>
                <th class="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in posts.slice(0, 6)" :key="post.id">
                <td>
                  <NuxtLink :to="`/admin/posts/${post.id}`" class="recent-title">{{ post.title }}</NuxtLink>
                </td>
                <td>
                  <span class="recent-category">{{ post.category?.name || '未分类' }}</span>
                </td>
                <td>
                  <span class="recent-status" :class="statusClass(post.status)">
                    <UIcon :name="post.status === 'PUBLISHED' ? 'i-lucide-check-circle-2' : 'i-lucide-clock'" class="size-3.5" />
                    {{ statusText(post.status) }}
                  </span>
                </td>
                <td>
                  <span class="recent-metric">
                    <UIcon name="i-lucide-eye" class="size-3.5" />
                    {{ formatNumber(post.viewCount || 0) }}
                  </span>
                </td>
                <td>
                  <span class="recent-date">
                    <UIcon name="i-lucide-clock" class="size-3.5" />
                    {{ formatDate(post.updatedAt) }}
                  </span>
                </td>
                <td class="text-right">
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-more-vertical" :to="`/admin/posts/${post.id}`" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="dashboard-empty">
          <UIcon name="i-lucide-file-plus-2" class="size-12" />
          <p>还没有文章</p>
          <UButton class="mt-3" icon="i-lucide-plus" to="/admin/posts/create">创建第一篇文章</UButton>
        </div>
      </section>

      <aside class="dashboard-side">
        <section class="dashboard-quick-card">
          <UIcon name="i-lucide-settings" class="quick-bg" />
          <h2>快捷操作</h2>
          <div class="quick-grid">
            <NuxtLink v-for="action in quickActions" :key="action.label" :to="action.to">
              <UIcon :name="action.icon" class="size-5" />
              <span>{{ action.label }}</span>
            </NuxtLink>
          </div>
        </section>

        <section class="dashboard-panel dashboard-notices">
          <div class="dashboard-panel-head">
            <div><h2>最近注册</h2><p>最新加入的站点用户</p></div>
            <UButton color="neutral" variant="ghost" size="xs" to="/admin/users">管理</UButton>
          </div>
          <div class="notice-list">
            <div v-for="user in recentUsers" :key="user.id" class="notice-item">
              <span class="notice-icon is-indigo"><UIcon name="i-lucide-user-round" class="size-4" /></span>
              <span><strong>{{ user.username }}</strong><small>{{ user.email || '未设置邮箱' }} · {{ formatDate(user.createdAt) }}</small></span>
            </div>
            <div v-if="!recentUsers.length" class="notice-item"><span><small>暂无注册用户</small></span></div>
          </div>
        </section>

        <section class="dashboard-panel dashboard-notices">
          <h2>系统通知</h2>
          <div class="notice-list">
            <div class="notice-item">
              <span class="notice-icon is-indigo">
                <UIcon name="i-lucide-bell" class="size-4" />
              </span>
              <span>
                <strong>后台样式已启用新版布局</strong>
                <small>文章、分类、标签和菜单页面已经切换到工作台式界面。</small>
              </span>
            </div>
            <div class="notice-item">
              <span class="notice-icon is-emerald">
                <UIcon name="i-lucide-check-circle-2" class="size-4" />
              </span>
              <span>
                <strong>SEO 设置可在后台维护</strong>
                <small>站点标题、关键词、描述和 noindex 已集中在设置页。</small>
              </span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

type Taxonomy = {
  id: number
  name: string
  slug: string
}

type AdminPost = {
  id: number
  title: string
  slug: string
  status: PostStatus
  viewCount?: number | null
  category?: Taxonomy | null
  updatedAt: string
}

type DashboardUser = { id: number, username: string, email: string | null, createdAt: string }
type UserOverview = { total: number, active: number, disabled: number, admins: number, newThisMonth: number, aiUsageThisMonth: number }

const searchText = ref('')

const { data: postData } = await useFetch<{ data: { items: AdminPost[], total: number } }>('/api/admin/posts', {
  query: {
    page: 1,
    pageSize: 8,
    sort: 'updatedAt_desc'
  }
})
const { data: userOverviewData } = await useFetch<{ data: UserOverview }>('/api/admin/users/overview')
const { data: recentUserData } = await useFetch<{ data: { items: DashboardUser[], total: number } }>('/api/admin/users', { query: { page: 1, pageSize: 5, sort: 'createdAt_desc' } })

const posts = computed(() => postData.value?.data.items || [])
const postTotal = computed(() => postData.value?.data.total || 0)
const userOverview = computed(() => userOverviewData.value?.data || { total: 0, active: 0, disabled: 0, admins: 0, newThisMonth: 0, aiUsageThisMonth: 0 })
const recentUsers = computed(() => recentUserData.value?.data.items || [])
const publishedCount = computed(() => posts.value.filter((post) => post.status === 'PUBLISHED').length)
const draftCount = computed(() => posts.value.filter((post) => post.status !== 'PUBLISHED').length)
const totalViews = computed(() => posts.value.reduce((sum, post) => sum + (post.viewCount || 0), 0))

const statCards = computed(() => [
  {
    title: '总浏览量',
    value: formatNumber(totalViews.value),
    hint: '按最近文章统计浏览数据',
    icon: 'i-lucide-eye',
    iconClass: 'is-indigo',
    trend: '+实时',
    trendIcon: 'i-lucide-trending-up',
    trendClass: 'is-up'
  },
  {
    title: '文章总数',
    value: formatNumber(postTotal.value),
    hint: `${publishedCount.value} 篇已发布，${draftCount.value} 篇草稿/归档`,
    icon: 'i-lucide-file-text',
    iconClass: 'is-blue',
    trend: '+内容',
    trendIcon: 'i-lucide-trending-up',
    trendClass: 'is-up'
  },
  {
    title: '用户总数',
    value: formatNumber(userOverview.value.total),
    hint: `${userOverview.value.active} 位正常，${userOverview.value.disabled} 位已禁用`,
    icon: 'i-lucide-users',
    iconClass: 'is-emerald',
    trend: `+${userOverview.value.newThisMonth} 本月`,
    trendIcon: 'i-lucide-user-plus',
    trendClass: 'is-flat'
  },
  {
    title: '本月 AI 使用',
    value: formatNumber(userOverview.value.aiUsageThisMonth),
    hint: `${userOverview.value.admins} 位正常管理员`,
    icon: 'i-lucide-sparkles',
    iconClass: 'is-rose',
    trend: '本月',
    trendIcon: 'i-lucide-calendar-days',
    trendClass: 'is-flat'
  }
])

const quickActions = [
  { label: '写文章', icon: 'i-lucide-plus', to: '/admin/posts/create' },
  { label: '文章管理', icon: 'i-lucide-file-text', to: '/admin/posts' },
  { label: '用户管理', icon: 'i-lucide-users', to: '/admin/users' },
  { label: '站点设置', icon: 'i-lucide-settings', to: '/admin/settings' }
]

function goSearch() {
  const query = searchText.value.trim()
  return navigateTo(query ? `/admin/posts?search=${encodeURIComponent(query)}` : '/admin/posts')
}

function statusText(status?: string) {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'ARCHIVED') return '回收站'
  return '草稿'
}

function statusClass(status?: string) {
  if (status === 'PUBLISHED') return 'is-published'
  if (status === 'ARCHIVED') return 'is-archived'
  return 'is-draft'
}

function formatDate(value?: string | Date | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}
</script>

<style scoped>
.dashboard-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
  gap: 0.875rem;
}

.dashboard-hero,
.dashboard-title,
.dashboard-hero-actions,
.dashboard-stat-top,
.dashboard-trend,
.recent-status,
.recent-metric,
.recent-date,
.quick-grid a,
.notice-item {
  display: flex;
  align-items: center;
}

.dashboard-hero {
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 48px rgba(15, 23, 42, 0.08);
  padding: 0.75rem 1rem;
}

.dashboard-title {
  gap: 0.9rem;
  min-width: 0;
}

.dashboard-title-icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.65rem;
  background: #eef2ff;
  color: #4f46e5;
}

.dashboard-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.15rem;
  font-weight: 850;
  line-height: 1.2;
}

.dashboard-title p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.dashboard-hero-actions {
  gap: 0.65rem;
}

.dashboard-search {
  width: min(18rem, 36vw);
}

.dashboard-stats {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.dashboard-stat-card {
  display: grid;
  gap: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 48px rgba(15, 23, 42, 0.08);
  padding: 1rem;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.dashboard-stat-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 18px 38px rgba(79, 70, 229, 0.1);
  transform: translateY(-1px);
}

.dashboard-stat-top {
  justify-content: space-between;
}

.dashboard-stat-icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: 0.75rem;
  transition: transform 160ms ease;
}

.dashboard-stat-card:hover .dashboard-stat-icon {
  transform: scale(1.06);
}

.dashboard-stat-icon.is-indigo { background: #eef2ff; color: #4f46e5; }
.dashboard-stat-icon.is-blue { background: #eff6ff; color: #2563eb; }
.dashboard-stat-icon.is-emerald { background: #ecfdf5; color: #059669; }
.dashboard-stat-icon.is-rose { background: #fff1f2; color: #e11d48; }

.dashboard-trend {
  gap: 0.25rem;
  border-radius: 0.5rem;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.35rem 0.5rem;
}

.dashboard-trend.is-up {
  background: #ecfdf5;
  color: #059669;
}

.dashboard-trend.is-flat {
  background: #f1f5f9;
  color: #64748b;
}

.dashboard-stat-card h2 {
  margin: 0 0 0.25rem;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 750;
}

.dashboard-stat-card strong {
  display: block;
  color: #1e293b;
  font-size: 1.75rem;
  font-weight: 850;
  line-height: 1.1;
}

.dashboard-stat-card p {
  margin: 0.5rem 0 0;
  color: #94a3b8;
  font-size: 0.78rem;
}

.dashboard-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr);
}

.dashboard-panel,
.dashboard-quick-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 48px rgba(15, 23, 42, 0.08);
}

.dashboard-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.85rem 1rem;
}

.dashboard-panel-head h2,
.dashboard-quick-card h2,
.dashboard-notices h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 850;
}

.dashboard-panel-head p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.dashboard-table-wrap {
  overflow-x: auto;
}

.dashboard-table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}

.dashboard-table thead {
  background: rgba(248, 250, 252, 0.76);
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 750;
}

.dashboard-table th,
.dashboard-table td {
  border-bottom: 1px solid #f1f5f9;
  padding: 0.8rem 1rem;
}

.dashboard-table tbody tr {
  transition: background-color 160ms ease;
}

.dashboard-table tbody tr:hover {
  background: rgba(248, 250, 252, 0.82);
}

.recent-title {
  display: block;
  max-width: 20rem;
  overflow: hidden;
  color: #0f172a;
  font-weight: 750;
  text-overflow: ellipsis;
}

.recent-title:hover {
  color: #4f46e5;
}

.recent-category {
  border-radius: 0.45rem;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.55rem;
}

.recent-status,
.recent-metric,
.recent-date {
  gap: 0.35rem;
}

.recent-status {
  width: max-content;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.35rem 0.6rem;
}

.recent-status.is-published {
  background: #ecfdf5;
  color: #059669;
}

.recent-status.is-draft {
  background: #f1f5f9;
  color: #64748b;
}

.recent-status.is-archived {
  background: #fff1f2;
  color: #e11d48;
}

.recent-metric,
.recent-date {
  color: #64748b;
  font-size: 0.82rem;
}

.dashboard-empty {
  display: grid;
  place-items: center;
  padding: 3.5rem 1rem;
  color: #94a3b8;
  text-align: center;
}

.dashboard-empty p {
  margin-top: 0.8rem;
  color: #334155;
  font-weight: 800;
}

.dashboard-side {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.dashboard-quick-card {
  position: relative;
  border: 0;
  background: linear-gradient(135deg, #4f46e5, #3730a3);
  color: #fff;
  padding: 1rem;
}

.quick-bg {
  position: absolute;
  top: -0.8rem;
  right: -0.8rem;
  width: 7rem;
  height: 7rem;
  color: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.dashboard-quick-card h2 {
  position: relative;
  z-index: 1;
  color: #fff;
  margin-bottom: 0.9rem;
}

.quick-grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.quick-grid a {
  justify-content: center;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 5rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 750;
  text-align: center;
  transition: background-color 160ms ease;
}

.quick-grid a:hover {
  background: rgba(255, 255, 255, 0.18);
}

.dashboard-notices {
  padding: 1rem;
}

.notice-list {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.notice-item {
  align-items: flex-start;
  gap: 0.75rem;
}

.notice-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.65rem;
}

.notice-icon.is-indigo {
  background: #eef2ff;
  color: #4f46e5;
}

.notice-icon.is-emerald {
  background: #ecfdf5;
  color: #059669;
}

.notice-item strong {
  display: block;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 800;
}

.notice-item small {
  display: block;
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.76rem;
  line-height: 1.55;
}

@media (max-width: 1120px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-hero,
  .dashboard-hero-actions,
  .dashboard-panel-head {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-search {
    width: 100%;
  }

  .dashboard-stats,
  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
