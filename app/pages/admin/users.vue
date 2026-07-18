<template>
  <div class="users-page">
    <header class="users-hero">
      <div class="users-title">
        <span class="users-title-icon"><UIcon name="i-lucide-users" class="size-6" /></span>
        <div>
          <h1>用户管理</h1>
          <p>管理账号权限、登录状态和使用情况。</p>
        </div>
      </div>
      <UButton icon="i-lucide-user-plus" @click="openCreate">创建用户</UButton>
    </header>

    <section class="users-stats">
      <article>
        <span class="is-blue"><UIcon name="i-lucide-users" /></span>
        <div><small>用户总数</small><strong>{{ overview.total }}</strong></div>
      </article>
      <article>
        <span class="is-green"><UIcon name="i-lucide-user-check" /></span>
        <div><small>正常用户</small><strong>{{ overview.active }}</strong></div>
      </article>
      <article>
        <span class="is-red"><UIcon name="i-lucide-user-x" /></span>
        <div><small>已禁用</small><strong>{{ overview.disabled }}</strong></div>
      </article>
      <article>
        <span class="is-purple"><UIcon name="i-lucide-shield-check" /></span>
        <div><small>正常管理员</small><strong>{{ overview.admins }}</strong></div>
      </article>
    </section>

    <section class="users-panel">
      <div class="users-toolbar">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          placeholder="搜索用户名或邮箱"
          class="users-search"
        />
        <USelect v-model="role" :items="roleFilters" class="users-filter" />
        <USelect v-model="status" :items="statusFilters" class="users-filter" />
        <USelect v-model="sort" :items="sortOptions" class="users-sort" />
        <UButton color="neutral" variant="outline" icon="i-lucide-rotate-cw" :loading="pending" @click="refreshAll">刷新</UButton>
      </div>

      <div v-if="pending" class="users-state"><UIcon name="i-lucide-loader-2" class="users-spin" />正在加载用户</div>
      <div v-else-if="!users.length" class="users-state">
        <UIcon name="i-lucide-user-search" class="size-10" />
        <strong>没有找到用户</strong>
        <span>可以调整搜索词或筛选条件。</span>
      </div>

      <template v-else>
        <div class="users-table-wrap">
          <table class="users-table">
            <thead><tr><th>用户</th><th>角色</th><th>状态</th><th>AI 使用</th><th>最近登录</th><th>注册时间</th><th class="user-actions-heading">操作</th></tr></thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <button class="user-identity" type="button" @click="openDetail(user)">
                    <span class="user-avatar">{{ user.username.slice(0, 1).toUpperCase() }}</span>
                    <span><strong>{{ user.username }}</strong><small>{{ user.email || '未设置邮箱' }}</small></span>
                  </button>
                </td>
                <td><span class="user-badge" :class="user.role === 'ADMIN' ? 'is-admin' : 'is-user'">{{ roleLabel(user.role) }}</span></td>
                <td><span class="user-badge" :class="user.status === 'ACTIVE' ? 'is-active' : 'is-disabled'">{{ statusLabel(user.status) }}</span></td>
                <td>{{ formatNumber(user.aiUsageCount) }}</td>
                <td>{{ formatDateTime(user.lastLoginAt) }}</td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td class="user-actions-cell">
                  <div class="user-actions">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eye" @click="openDetail(user)">查看</UButton>
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-key-round" @click="openPassword(user)">重置密码</UButton>
                    <UButton
                      size="xs" color="neutral" variant="ghost"
                      :icon="user.role === 'ADMIN' ? 'i-lucide-shield-off' : 'i-lucide-shield-plus'"
                      :disabled="user.id === currentUserId"
                      :title="user.id === currentUserId ? '不能调整自己的管理员角色' : undefined"
                      @click="toggleRole(user)"
                    >
                      {{ user.role === 'ADMIN' ? '降为普通用户' : '设为管理员' }}
                    </UButton>
                    <UButton
                      size="xs" :color="user.status === 'ACTIVE' ? 'error' : 'success'" variant="soft"
                      :icon="user.status === 'ACTIVE' ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                      :disabled="user.id === currentUserId"
                      :title="user.id === currentUserId ? '不能禁用自己的账号' : undefined"
                      @click="toggleStatus(user)"
                    >
                      {{ user.status === 'ACTIVE' ? '禁用' : '启用' }}
                    </UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="users-cards">
          <article v-for="user in users" :key="user.id" class="user-card">
            <button class="user-identity" type="button" @click="openDetail(user)">
              <span class="user-avatar">{{ user.username.slice(0, 1).toUpperCase() }}</span>
              <span><strong>{{ user.username }}</strong><small>{{ user.email || '未设置邮箱' }}</small></span>
            </button>
            <div class="user-card-badges">
              <span class="user-badge" :class="user.role === 'ADMIN' ? 'is-admin' : 'is-user'">{{ roleLabel(user.role) }}</span>
              <span class="user-badge" :class="user.status === 'ACTIVE' ? 'is-active' : 'is-disabled'">{{ statusLabel(user.status) }}</span>
            </div>
            <dl><div><dt>AI 使用</dt><dd>{{ formatNumber(user.aiUsageCount) }}</dd></div><div><dt>最近登录</dt><dd>{{ formatDate(user.lastLoginAt) }}</dd></div></dl>
            <div class="user-card-actions">
              <UButton size="sm" color="neutral" variant="outline" @click="openDetail(user)">详情</UButton>
              <UButton size="sm" color="neutral" variant="outline" @click="openPassword(user)">重置密码</UButton>
              <UButton size="sm" color="neutral" variant="outline" :disabled="user.id === currentUserId" @click="toggleRole(user)">{{ user.role === 'ADMIN' ? '降级' : '设为管理员' }}</UButton>
              <UButton size="sm" :color="user.status === 'ACTIVE' ? 'error' : 'success'" variant="soft" :disabled="user.id === currentUserId" @click="toggleStatus(user)">{{ user.status === 'ACTIVE' ? '禁用' : '启用' }}</UButton>
            </div>
          </article>
        </div>
      </template>

      <footer class="users-pagination">
        <span>共 {{ total }} 位用户，第 {{ page }} / {{ totalPages }} 页</span>
        <div class="users-pagination-actions" aria-label="用户列表分页">
          <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="page <= 1" @click="page--">上一页</UButton>
          <UButton size="sm" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-right" :disabled="page >= totalPages" @click="page++">下一页</UButton>
        </div>
      </footer>
    </section>

    <UModal v-model:open="createOpen" title="创建用户" description="创建一个可以登录站点的新账号。">
      <template #body>
        <form class="user-form" @submit.prevent="createUser">
          <UFormField label="用户名" required><UInput v-model="createForm.username" class="w-full" autocomplete="off" placeholder="3-32 位字母、数字或连接符" /></UFormField>
          <UFormField label="邮箱" required><UInput v-model="createForm.email" class="w-full" type="email" autocomplete="off" placeholder="user@example.com" /></UFormField>
          <UFormField label="初始密码" required><UInput v-model="createForm.password" class="w-full" type="password" autocomplete="new-password" placeholder="至少 12 位" /></UFormField>
          <div class="user-form-grid">
            <UFormField label="角色"><USelect v-model="createForm.role" :items="roleOptions" class="w-full" /></UFormField>
            <UFormField label="状态"><USelect v-model="createForm.status" :items="statusOptions" class="w-full" /></UFormField>
          </div>
          <p v-if="formError" class="user-form-error">{{ formError }}</p>
          <div class="user-form-actions"><UButton type="button" color="neutral" variant="outline" @click="createOpen = false">取消</UButton><UButton type="submit" icon="i-lucide-user-plus" :loading="saving">创建用户</UButton></div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="passwordOpen" title="重置密码" :description="passwordTarget ? `为 ${passwordTarget.username} 设置新密码。` : ''">
      <template #body>
        <form class="user-form" @submit.prevent="resetPassword">
          <UFormField label="新密码" required><UInput v-model="passwordForm.password" class="w-full" type="password" autocomplete="new-password" placeholder="至少 12 位" /></UFormField>
          <UFormField label="确认新密码" required><UInput v-model="passwordForm.confirmPassword" class="w-full" type="password" autocomplete="new-password" /></UFormField>
          <p v-if="formError" class="user-form-error">{{ formError }}</p>
          <div class="user-form-actions"><UButton type="button" color="neutral" variant="outline" @click="passwordOpen = false">取消</UButton><UButton type="submit" icon="i-lucide-key-round" :loading="saving">确认重置</UButton></div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="detailOpen" title="用户详情" description="账号信息、使用统计和最近管理操作。" :ui="{ content: 'max-w-3xl' }">
      <template #body>
        <div v-if="detailLoading" class="users-state"><UIcon name="i-lucide-loader-2" class="users-spin" />加载详情</div>
        <div v-else-if="detail" class="user-detail">
          <section class="detail-profile">
            <span class="user-avatar is-large">{{ detail.username.slice(0, 1).toUpperCase() }}</span>
            <div><h2>{{ detail.username }}</h2><p>{{ detail.email || '未设置邮箱' }}</p><span class="user-badge" :class="detail.role === 'ADMIN' ? 'is-admin' : 'is-user'">{{ roleLabel(detail.role) }}</span> <span class="user-badge" :class="detail.status === 'ACTIVE' ? 'is-active' : 'is-disabled'">{{ statusLabel(detail.status) }}</span></div>
            <dl><div><dt>用户 ID</dt><dd>{{ detail.id }}</dd></div><div><dt>注册时间</dt><dd>{{ formatDateTime(detail.createdAt) }}</dd></div><div><dt>最近登录</dt><dd>{{ formatDateTime(detail.lastLoginAt) }}</dd></div></dl>
          </section>
          <section><h3>使用统计</h3><div class="detail-stats"><div><small>AI 请求</small><strong>{{ detail.stats.aiUsageTotal }}</strong></div><div><small>成功</small><strong>{{ detail.stats.aiUsageSuccess }}</strong></div><div><small>失败</small><strong>{{ detail.stats.aiUsageFailed }}</strong></div><div><small>被拦截</small><strong>{{ detail.stats.aiUsageBlocked }}</strong></div><div><small>知识问答</small><strong>{{ detail.stats.ragQueries }}</strong></div><div><small>文章对话</small><strong>{{ detail.stats.articleChats }}</strong></div></div></section>
          <section><h3>最近 AI 使用</h3><div v-if="detail.recentAiUsage.length" class="detail-logs"><div v-for="item in detail.recentAiUsage" :key="item.id"><span><strong>{{ item.feature }}</strong><small>{{ aiStatusLabel(item.status) }}</small></span><time>{{ formatDateTime(item.createdAt) }}</time></div></div><p v-else class="detail-empty">暂无 AI 使用记录</p></section>
          <section><h3>最近管理操作</h3><div v-if="detail.recentAuditLogs.length" class="detail-logs"><div v-for="log in detail.recentAuditLogs" :key="log.id"><span><strong>{{ auditLabel(log.action) }}</strong><small>{{ log.operator?.username || '已删除的管理员' }}</small></span><time>{{ formatDateTime(log.createdAt) }}</time></div></div><p v-else class="detail-empty">暂无管理操作记录</p></section>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { AdminUserDetail, AdminUserListItem, AdminUserOverview, PaginationPayload, UserRolePayload, UserStatusPayload } from '~~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const pageSize = 20
const page = ref(Math.max(1, Number(route.query.page) || 1))
const searchInput = ref(typeof route.query.search === 'string' ? route.query.search : '')
const search = ref(searchInput.value)
const role = ref(typeof route.query.role === 'string' && ['ADMIN', 'USER'].includes(route.query.role) ? route.query.role : 'ALL')
const status = ref(typeof route.query.status === 'string' && ['ACTIVE', 'DISABLED'].includes(route.query.status) ? route.query.status : 'ALL')
const sort = ref(typeof route.query.sort === 'string' && ['createdAt_desc', 'createdAt_asc', 'lastLoginAt_desc', 'username_asc'].includes(route.query.sort) ? route.query.sort : 'createdAt_desc')

const roleFilters = [{ label: '全部角色', value: 'ALL' }, { label: '管理员', value: 'ADMIN' }, { label: '普通用户', value: 'USER' }]
const statusFilters = [{ label: '全部状态', value: 'ALL' }, { label: '正常', value: 'ACTIVE' }, { label: '已禁用', value: 'DISABLED' }]
const sortOptions = [{ label: '最新注册', value: 'createdAt_desc' }, { label: '最早注册', value: 'createdAt_asc' }, { label: '最近登录', value: 'lastLoginAt_desc' }, { label: '用户名', value: 'username_asc' }]
const roleOptions = roleFilters.slice(1)
const statusOptions = statusFilters.slice(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { search.value = value.trim(); page.value = 1 }, 300)
})
watch([role, status, sort], () => { page.value = 1 })
onBeforeUnmount(() => clearTimeout(searchTimer))

const query = computed(() => ({
  page: page.value,
  pageSize,
  search: search.value || undefined,
  role: role.value === 'ALL' ? undefined : role.value,
  status: status.value === 'ALL' ? undefined : status.value,
  sort: sort.value
}))

const { data, pending, refresh } = await useFetch<{ data: PaginationPayload<AdminUserListItem> }>('/api/admin/users', { query })
const { data: overviewData, refresh: refreshOverview } = await useFetch<{ data: AdminUserOverview }>('/api/admin/users/overview')
const { data: sessionData } = await useFetch<{ data: { user: { id: number } | null } }>('/api/auth/me')
const users = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const overview = computed(() => overviewData.value?.data || { total: 0, active: 0, disabled: 0, admins: 0, newThisMonth: 0, aiUsageThisMonth: 0 })
const currentUserId = computed(() => sessionData.value?.data.user?.id)

watch(query, value => router.replace({ query: { ...(value.page > 1 ? { page: String(value.page) } : {}), ...(value.search ? { search: value.search } : {}), ...(value.role ? { role: value.role } : {}), ...(value.status ? { status: value.status } : {}), ...(value.sort !== 'createdAt_desc' ? { sort: value.sort } : {}) } }), { deep: true })
watch(totalPages, value => { if (page.value > value) page.value = value })

const createOpen = ref(false)
const passwordOpen = ref(false)
const detailOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const createForm = reactive<{ username: string, email: string, password: string, role: UserRolePayload, status: UserStatusPayload }>({ username: '', email: '', password: '', role: 'USER', status: 'ACTIVE' })
const passwordTarget = ref<AdminUserListItem | null>(null)
const passwordForm = reactive({ password: '', confirmPassword: '' })
const detail = ref<AdminUserDetail | null>(null)
const detailLoading = ref(false)

function openCreate() { Object.assign(createForm, { username: '', email: '', password: '', role: 'USER', status: 'ACTIVE' }); formError.value = ''; createOpen.value = true }
function openPassword(user: AdminUserListItem) { passwordTarget.value = user; passwordForm.password = ''; passwordForm.confirmPassword = ''; formError.value = ''; passwordOpen.value = true }

async function createUser() {
  saving.value = true; formError.value = ''
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: createForm })
    createOpen.value = false; toast.add({ title: '用户已创建', color: 'success' }); await refreshAll()
  } catch (error) { formError.value = getApiErrorMessage(error, { fallback: '创建用户失败' }) } finally { saving.value = false }
}

async function resetPassword() {
  if (!passwordTarget.value) return
  if (passwordForm.password !== passwordForm.confirmPassword) { formError.value = '两次输入的密码不一致'; return }
  saving.value = true; formError.value = ''
  try {
    await $fetch(`/api/admin/users/${passwordTarget.value.id}/password`, { method: 'PUT', body: passwordForm })
    passwordOpen.value = false; toast.add({ title: '密码已重置', color: 'success' })
  } catch (error) { formError.value = getApiErrorMessage(error, { fallback: '重置密码失败' }) } finally { saving.value = false }
}

async function toggleRole(user: AdminUserListItem) {
  const nextRole: UserRolePayload = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
  if (!confirm(`确认将“${user.username}”${nextRole === 'ADMIN' ? '设为管理员' : '降为普通用户'}吗？`)) return
  await runUserAction(`/api/admin/users/${user.id}/role`, { role: nextRole }, '用户角色已更新')
}

async function toggleStatus(user: AdminUserListItem) {
  const nextStatus: UserStatusPayload = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  if (!confirm(`确认${nextStatus === 'ACTIVE' ? '启用' : '禁用'}“${user.username}”吗？`)) return
  await runUserAction(`/api/admin/users/${user.id}/status`, { status: nextStatus }, `用户已${nextStatus === 'ACTIVE' ? '启用' : '禁用'}`)
}

async function runUserAction(url: string, body: object, success: string) {
  try { await $fetch(url, { method: 'PUT', body }); toast.add({ title: success, color: 'success' }); await refreshAll(); if (detailOpen.value && detail.value) await loadDetail(detail.value.id) }
  catch (error) { toast.add({ title: getApiErrorMessage(error, { fallback: '操作失败' }), color: 'error' }) }
}

async function openDetail(user: AdminUserListItem) { detailOpen.value = true; await loadDetail(user.id) }
async function loadDetail(id: number) {
  detailLoading.value = true; detail.value = null
  try { const result = await $fetch<{ data: AdminUserDetail }>(`/api/admin/users/${id}`); detail.value = result.data }
  catch (error) { toast.add({ title: getApiErrorMessage(error, { fallback: '加载用户详情失败' }), color: 'error' }); detailOpen.value = false }
  finally { detailLoading.value = false }
}
async function refreshAll() { await Promise.all([refresh(), refreshOverview()]) }
function roleLabel(value: string) { return value === 'ADMIN' ? '管理员' : '普通用户' }
function statusLabel(value: string) { return value === 'ACTIVE' ? '正常' : '已禁用' }
function auditLabel(value: string) { return ({ USER_CREATED: '创建用户', USER_ROLE_CHANGED: '修改角色', USER_STATUS_CHANGED: '修改状态', USER_PASSWORD_RESET: '重置密码' } as Record<string, string>)[value] || value }
function aiStatusLabel(value: string) { return ({ SUCCESS: '成功', FAILED: '失败', BLOCKED: '被拦截' } as Record<string, string>)[value] || value }
function formatDate(value?: string | Date | null) { return value ? new Date(value).toLocaleDateString('zh-CN') : '从未登录' }
function formatDateTime(value?: string | Date | null) { return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '从未登录' }
function formatNumber(value: number) { return new Intl.NumberFormat('zh-CN').format(value) }
</script>

<style scoped>
.users-page :deep(button:not(:disabled)){cursor:pointer}.users-page :deep(button:disabled){cursor:not-allowed}
.users-page{display:grid;gap:1rem}.users-hero,.users-panel{border:1px solid #e2e8f0;background:#fff;border-radius:1rem;box-shadow:0 12px 30px rgb(15 23 42/5%)}.users-hero{display:flex;align-items:center;justify-content:space-between;padding:1.25rem}.users-title{display:flex;align-items:center;gap:.85rem}.users-title h1{font-size:1.35rem;font-weight:750;color:#0f172a}.users-title p{margin-top:.2rem;font-size:.875rem;color:#64748b}.users-title-icon{display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:.8rem;color:#4f46e5;background:#eef2ff}.users-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}.users-stats article{display:flex;align-items:center;gap:.75rem;padding:1rem;border:1px solid #e2e8f0;border-radius:.9rem;background:#fff}.users-stats article>span{display:grid;place-items:center;width:2.5rem;height:2.5rem;border-radius:.7rem}.users-stats svg{width:1.15rem;height:1.15rem}.users-stats .is-blue{color:#2563eb;background:#eff6ff}.users-stats .is-green{color:#059669;background:#ecfdf5}.users-stats .is-red{color:#dc2626;background:#fef2f2}.users-stats .is-purple{color:#7c3aed;background:#f5f3ff}.users-stats small{display:block;color:#64748b}.users-stats strong{font-size:1.35rem;color:#0f172a}.users-panel{overflow:hidden}.users-toolbar{display:flex;gap:.65rem;padding:1rem;border-bottom:1px solid #e2e8f0}.users-search{flex:1;min-width:14rem}.users-filter{width:9rem}.users-sort{width:10rem}.users-table-wrap{overflow-x:auto}.users-table{width:100%;border-collapse:collapse;font-size:.875rem}.users-table th{padding:.75rem 1rem;text-align:left;font-size:.75rem;font-weight:650;color:#64748b;background:#f8fafc;white-space:nowrap}.users-table td{padding:.85rem 1rem;border-top:1px solid #f1f5f9;color:#475569;white-space:nowrap}.users-table th.user-actions-heading,.users-table td.user-actions-cell{width:25rem;text-align:right}.users-table tbody tr:hover{background:#fafbff}.user-identity{display:flex;align-items:center;gap:.65rem;text-align:left}.user-identity>span:last-child{display:grid}.user-identity strong{color:#0f172a}.user-identity small{font-size:.75rem;color:#94a3b8}.user-avatar{display:grid;place-items:center;width:2.15rem;height:2.15rem;flex:0 0 auto;border-radius:50%;font-weight:750;color:#4338ca;background:linear-gradient(135deg,#e0e7ff,#f5f3ff)}.user-avatar.is-large{width:3.75rem;height:3.75rem;font-size:1.25rem}.user-badge{display:inline-flex;padding:.22rem .5rem;border-radius:999px;font-size:.72rem;font-weight:650}.user-badge.is-admin{color:#6d28d9;background:#f3e8ff}.user-badge.is-user{color:#1d4ed8;background:#dbeafe}.user-badge.is-active{color:#047857;background:#d1fae5}.user-badge.is-disabled{color:#b91c1c;background:#fee2e2}.user-actions{display:flex;justify-content:flex-end;gap:.35rem}.users-pagination{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1rem;padding:.9rem 1rem;border-top:1px solid #e2e8f0;font-size:.8rem;color:#64748b}.users-pagination-actions{display:flex;justify-content:flex-end;gap:.5rem}.users-state{min-height:15rem;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.5rem;color:#64748b}.users-state strong{color:#334155}.users-state span{font-size:.82rem}.users-spin{animation:users-spin .8s linear infinite}.users-cards{display:none}.user-form{display:grid;gap:1rem}.user-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.user-form-actions{display:flex;justify-content:flex-end;gap:.6rem;padding-top:.35rem}.user-form-error{padding:.65rem .75rem;border-radius:.5rem;color:#b91c1c;background:#fef2f2;font-size:.82rem}.user-detail{display:grid;gap:1.25rem}.detail-profile{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.85rem;padding-bottom:1rem;border-bottom:1px solid #e2e8f0}.detail-profile h2{font-size:1.15rem;font-weight:750;color:#0f172a}.detail-profile p{margin:.15rem 0 .45rem;color:#64748b}.detail-profile dl{display:grid;gap:.3rem;font-size:.78rem}.detail-profile dl div{display:flex;justify-content:space-between;gap:1.5rem}.detail-profile dt{color:#94a3b8}.detail-profile dd{color:#475569}.user-detail h3{margin-bottom:.65rem;font-weight:700;color:#334155}.detail-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem}.detail-stats div{padding:.7rem;text-align:center;border-radius:.65rem;background:#f8fafc}.detail-stats small{display:block;color:#64748b}.detail-stats strong{font-size:1.05rem;color:#0f172a}.detail-logs{display:grid}.detail-logs>div{display:flex;justify-content:space-between;padding:.65rem 0;border-top:1px solid #f1f5f9}.detail-logs span{display:grid}.detail-logs small,.detail-logs time,.detail-empty{font-size:.75rem;color:#94a3b8}@keyframes users-spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.users-stats{grid-template-columns:repeat(2,1fr)}.users-toolbar{flex-wrap:wrap}.users-search{flex-basis:100%}.users-filter,.users-sort{flex:1}.users-table-wrap{display:none}.users-cards{display:grid;gap:.75rem;padding:.85rem}.user-card{display:grid;gap:.75rem;padding:1rem;border:1px solid #e2e8f0;border-radius:.8rem}.user-card-badges{display:flex;gap:.4rem}.user-card dl{display:grid;grid-template-columns:1fr 1fr;padding:.65rem;border-radius:.6rem;background:#f8fafc}.user-card dl div{display:grid;gap:.15rem}.user-card dt{font-size:.72rem;color:#94a3b8}.user-card dd{font-size:.85rem;color:#334155}.user-card-actions{display:flex;flex-wrap:wrap;gap:.4rem}.detail-stats{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.users-hero{align-items:flex-start;gap:1rem}.users-title p{display:none}.users-stats{grid-template-columns:1fr 1fr}.users-toolbar>*{width:100%;flex-basis:100%}.users-pagination{align-items:flex-start;gap:.75rem;flex-direction:column}.detail-profile{grid-template-columns:auto 1fr}.detail-profile dl{grid-column:1/-1}.user-form-grid{grid-template-columns:1fr}.detail-stats{grid-template-columns:repeat(2,1fr)}}
</style>
