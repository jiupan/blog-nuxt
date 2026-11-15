<template>
  <div class="users-page">
    <AdminPageActions>
      <UButton
        icon="i-lucide-user-plus"
        size="sm"
        @click="openCreate"
      >
        创建用户
      </UButton>
    </AdminPageActions>
    <section
      class="users-stats"
      aria-label="用户概览"
    >
      <button
        type="button"
        @click="filterUsers('ALL', 'ALL')"
      >
        <span>全部用户</span>
        <strong>{{ overviewData ? overview.total : '—' }}</strong>
        <small>站点注册账号</small>
      </button>
      <button
        type="button"
        @click="filterUsers('ALL', 'ACTIVE')"
      >
        <span>正常用户</span>
        <strong>{{ overviewData ? overview.active : '—' }}</strong>
        <small>可以正常访问站点</small>
      </button>
      <button
        type="button"
        @click="filterUsers('ALL', 'DISABLED')"
      >
        <span>已禁用</span>
        <strong>{{ overviewData ? overview.disabled : '—' }}</strong>
        <small>点击查看受限账号</small>
      </button>
      <button
        type="button"
        @click="filterUsers('ADMIN', 'ACTIVE')"
      >
        <span>正常管理员</span>
        <strong>{{ overviewData ? overview.admins : '—' }}</strong>
        <small>具有后台管理权限</small>
      </button>
    </section>

    <section class="users-panel">
      <div class="users-toolbar">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          placeholder="搜索昵称、用户名或邮箱"
          class="users-search"
          aria-label="搜索昵称、用户名或邮箱"
        />
        <USelect
          v-model="role"
          :items="roleFilters"
          aria-label="用户角色"
          class="users-filter"
        />
        <USelect
          v-model="status"
          :items="statusFilters"
          aria-label="账号状态"
          class="users-filter"
        />
        <USelect
          v-model="sort"
          :items="sortOptions"
          aria-label="用户排序"
          class="users-sort"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-cw"
          :loading="pending"
          @click="refreshAll"
        >
          刷新
        </UButton>
      </div>

      <div
        v-if="error"
        class="workspace-empty"
        role="alert"
      >
        <UIcon name="i-lucide-wifi-off" />
        <h3>{{ error.statusCode === 401 ? '后台登录已过期' : error.statusCode === 403 ? '当前账号没有管理权限' : '用户加载失败' }}</h3>
        <UButton v-if="error.statusCode === 401 || error.statusCode === 403" :to="{ path: '/admin/login', query: { redirect: route.fullPath } }">重新登录</UButton>
        <UButton
          v-else
          color="neutral"
          variant="outline"
          @click="refresh()"
        >
          重新加载
        </UButton>
      </div>
      <div
        v-else-if="pending"
        class="users-state"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="users-spin"
        />
        正在加载用户
      </div>
      <div
        v-else-if="!users.length"
        class="users-state"
      >
        <UIcon
          name="i-lucide-user-search"
          class="size-10"
        />
        <strong>没有找到用户</strong>
        <span>可以调整搜索词或筛选条件。</span>
        <UButton
          color="neutral"
          variant="outline"
          @click="resetFilters"
        >
          清除筛选
        </UButton>
      </div>

      <template v-else>
        <div class="users-table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>角色</th>
                <th>状态</th>
                <th>累计 AI 请求</th>
                <th>最近登录</th>
                <th>注册时间</th>
                <th class="user-actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
              >
                <td>
                  <button
                    class="user-identity"
                    type="button"
                    @click="openDetail(user)"
                  >
                    <AccountAvatar :src="user.avatarUrl" :seed="user.displayName || user.username" :size="34" />
                    <span>
                      <strong>{{ user.displayName || user.username }}</strong>
                      <small v-if="user.displayName && user.displayName !== user.username">@{{ user.username }}</small>
                      <small>{{ user.email || user.pendingEmail || '未设置邮箱' }}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <span
                    class="user-badge"
                    :class="user.role === 'ADMIN' ? 'is-admin' : 'is-user'"
                  >
                    {{ roleLabel(user.role) }}
                  </span>
                </td>
                <td>
                  <span
                    class="user-badge"
                    :class="user.status === 'ACTIVE' ? 'is-active' : 'is-disabled'"
                  >
                    {{ statusLabel(user.status) }}
                  </span>
                </td>
                <td>{{ formatNumber(user.aiUsageCount) }}</td>
                <td :title="formatDateTime(user.lastLoginAt)">{{ formatLastLogin(user.lastLoginAt) }}</td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td class="user-actions-cell">
                  <div class="user-actions">
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      @click="openDetail(user)"
                    >
                      详情
                    </UButton>
                    <UDropdownMenu
                      :items="userActions(user)"
                      :content="{ align: 'end' }"
                    >
                      <UButton
                        size="sm"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-ellipsis"
                        :aria-label="`${user.username}的更多操作`"
                        :loading="actionUserId === user.id"
                      />
                    </UDropdownMenu>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="users-cards">
          <article
            v-for="user in users"
            :key="user.id"
            class="user-card"
          >
            <button
              class="user-identity"
              type="button"
              @click="openDetail(user)"
            >
              <AccountAvatar :src="user.avatarUrl" :seed="user.displayName || user.username" :size="34" />
              <span>
                <strong>{{ user.displayName || user.username }}</strong>
                <small v-if="user.displayName && user.displayName !== user.username">@{{ user.username }}</small>
                <small>{{ user.email || user.pendingEmail || '未设置邮箱' }}</small>
              </span>
            </button>
            <div class="user-card-badges">
              <span
                class="user-badge"
                :class="user.role === 'ADMIN' ? 'is-admin' : 'is-user'"
              >
                {{ roleLabel(user.role) }}
              </span>
              <span
                class="user-badge"
                :class="user.status === 'ACTIVE' ? 'is-active' : 'is-disabled'"
              >
                {{ statusLabel(user.status) }}
              </span>
            </div>
            <dl>
              <div>
                <dt>累计 AI 请求</dt>
                <dd>{{ formatNumber(user.aiUsageCount) }}</dd>
              </div>
              <div>
                <dt>最近登录</dt>
                <dd>{{ formatDate(user.lastLoginAt) }}</dd>
              </div>
            </dl>
            <div class="user-card-actions">
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                @click="openDetail(user)"
              >
                详情
              </UButton>
              <UDropdownMenu
                :items="userActions(user)"
                :content="{ align: 'end' }"
              >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-ellipsis"
                  :aria-label="`${user.username}的更多操作`"
                  :loading="actionUserId === user.id"
                />
              </UDropdownMenu>
            </div>
          </article>
        </div>
      </template>

      <footer class="users-pagination">
        <span>共 {{ total }} 位用户，第 {{ page }} / {{ totalPages }} 页</span>
        <div
          class="users-pagination-actions"
          aria-label="用户列表分页"
        >
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="page <= 1"
            @click="page--"
          >
            上一页
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-right"
            :disabled="page >= totalPages"
            @click="page++"
          >
            下一页
          </UButton>
        </div>
      </footer>
    </section>

    <UModal
      v-model:open="createOpen"
      title="创建用户"
      description="创建一个可以登录站点的新账号。"
    >
      <template #body>
        <form
          class="user-form"
          @submit.prevent="createUser"
        >
          <UFormField
            label="用户名"
            required
          >
            <UInput
              v-model="createForm.username"
              class="w-full"
              autocomplete="off"
              placeholder="3-32 位字母、数字或连接符"
            />
          </UFormField>
          <UFormField
            label="邮箱"
            required
          >
            <UInput
              v-model="createForm.email"
              class="w-full"
              type="email"
              autocomplete="off"
              placeholder="user@example.com"
            />
          </UFormField>
          <UCheckbox
            v-if="emailAvailable && createForm.status === 'ACTIVE'"
            v-model="createForm.invite"
            label="发送邮件，由用户设置密码"
          />
          <UFormField
            v-if="!createForm.invite || createForm.status !== 'ACTIVE'"
            label="初始密码"
            required
          >
            <UInput
              v-model="createForm.password"
              class="w-full"
              type="password"
              autocomplete="new-password"
              placeholder="至少 12 位"
            />
          </UFormField>
          <div class="user-form-grid">
            <UFormField label="角色">
              <USelect
                v-model="createForm.role"
                :items="roleOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="状态">
              <USelect
                v-model="createForm.status"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>
          </div>
          <p
            v-if="formError"
            class="user-form-error"
          >
            {{ formError }}
          </p>
          <div class="user-form-actions">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              @click="createOpen = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-user-plus"
              :loading="saving"
            >
              创建用户
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="passwordOpen"
      title="重置密码"
      :description="passwordTarget ? `为 ${passwordTarget.username} 重置密码。密码更新后，所有设备都需要重新登录。` : ''"
    >
      <template #body>
        <form
          class="user-form"
          @submit.prevent="resetPassword"
        >
          <UCheckbox
            v-if="canEmailReset"
            v-model="emailReset"
            label="发送重置邮件，由用户设置新密码"
          />
          <UFormField
            v-if="!emailReset"
            label="新密码"
            required
          >
            <UInput
              v-model="passwordForm.password"
              class="w-full"
              type="password"
              autocomplete="new-password"
              placeholder="至少 12 位"
            />
          </UFormField>
          <UFormField
            v-if="!emailReset"
            label="确认新密码"
            required
          >
            <UInput
              v-model="passwordForm.confirmPassword"
              class="w-full"
              type="password"
              autocomplete="new-password"
            />
          </UFormField>
          <p
            v-if="formError"
            class="user-form-error"
          >
            {{ formError }}
          </p>
          <div class="user-form-actions">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              @click="passwordOpen = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              icon="i-lucide-key-round"
              :loading="saving"
            >
              {{ emailReset ? '发送重置邮件' : '确认重置' }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="managementOpen"
      :title="managementAction?.title || '确认变更'"
      :description="managementAction ? `${managementAction.user.username}（ID ${managementAction.user.id}）：${managementAction.before} → ${managementAction.after}。现有登录会话将结束。` : ''"
    >
      <template #footer>
        <UButton color="neutral" variant="outline" @click="managementOpen = false">取消</UButton>
        <UButton :color="managementAction?.danger ? 'error' : 'primary'" :loading="actionUserId !== null" @click="confirmManagementAction">确认变更</UButton>
      </template>
    </UModal>

    <USlideover
      v-model:open="detailOpen"
      title="用户详情"
      description="账号信息、使用统计和最近管理操作。"
      :ui="{ content: 'max-w-3xl' }"
    >
      <template #body>
        <div
          v-if="detailLoading"
          class="users-state"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="users-spin"
          />
          加载详情
        </div>
        <UAlert v-else-if="detailError" color="error" variant="soft" :title="detailError">
          <template #actions><UButton size="sm" @click="retryDetail">重试</UButton></template>
        </UAlert>
        <div
          v-else-if="detail"
          class="user-detail"
        >
          <section class="detail-profile">
            <AccountAvatar :src="detail.avatarUrl" :seed="detail.displayName || detail.username" :size="50" />
            <div>
              <h2>{{ detail.displayName || detail.username }}</h2>
              <p v-if="detail.displayName && detail.displayName !== detail.username">@{{ detail.username }}</p>
              <p>{{ detail.email || '未设置邮箱' }} <UBadge v-if="detail.email" :color="detail.emailVerifiedAt ? 'success' : 'warning'" variant="soft">{{ detail.emailVerifiedAt ? '已验证' : '待验证' }}</UBadge></p>
              <p v-if="detail.pendingEmail">等待验证 {{ detail.pendingEmail }}</p>
              <span
                class="user-badge"
                :class="detail.role === 'ADMIN' ? 'is-admin' : 'is-user'"
              >
                {{ roleLabel(detail.role) }}
              </span>
              <span
                class="user-badge"
                :class="detail.status === 'ACTIVE' ? 'is-active' : 'is-disabled'"
              >
                {{ statusLabel(detail.status) }}
              </span>
            </div>
            <dl>
              <div>
                <dt>用户 ID</dt>
                <dd>{{ detail.id }}</dd>
              </div>
              <div>
                <dt>注册时间</dt>
                <dd>{{ formatDateTime(detail.createdAt) }}</dd>
              </div>
              <div>
                <dt>最近登录</dt>
                <dd>{{ formatDateTime(detail.lastLoginAt) }}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>使用统计</h3>
            <div class="detail-stats">
              <div>
                <small>AI 请求</small>
                <strong>{{ detail.stats.aiUsageTotal }}</strong>
              </div>
              <div>
                <small>成功</small>
                <strong>{{ detail.stats.aiUsageSuccess }}</strong>
              </div>
              <div>
                <small>失败</small>
                <strong>{{ detail.stats.aiUsageFailed }}</strong>
              </div>
              <div>
                <small>被拦截</small>
                <strong>{{ detail.stats.aiUsageBlocked }}</strong>
              </div>
              <div>
                <small>知识问答</small>
                <strong>{{ detail.stats.ragQueries }}</strong>
              </div>
              <div>
                <small>文章会话数</small>
                <strong>{{ detail.stats.articleChats }}</strong>
              </div>
              <div v-if="detail.stats.aiUsagePending">
                <small>待结算</small>
                <strong>{{ detail.stats.aiUsagePending }}</strong>
              </div>
            </div>
          </section>
          <section>
            <h3>最近 AI 使用</h3>
            <div
              v-if="detail.recentAiUsage.length"
              class="detail-logs"
            >
              <div
                v-for="item in detail.recentAiUsage"
                :key="item.id"
              >
                <span>
                  <strong>{{ item.feature === 'article-chat' ? '文章问答' : item.feature }}</strong>
                  <small>{{ aiStatusLabel(item.status) }}</small>
                </span>
                <time>{{ formatDateTime(item.createdAt) }}</time>
              </div>
            </div>
            <p
              v-else
              class="detail-empty"
            >
              暂无 AI 使用记录
            </p>
          </section>
          <section>
            <h3>管理记录</h3>
            <div
              v-if="detail.recentAuditLogs.length"
              class="detail-logs"
            >
              <div
                v-for="log in detail.recentAuditLogs"
                :key="log.id"
              >
                <span>
                  <strong>{{ auditLabel(log.action) }}</strong>
                  <small>{{ log.operator?.username || '已删除的管理员' }}</small>
                  <small v-if="auditChange(log)">{{ auditChange(log) }}</small>
                </span>
                <time>{{ formatDateTime(log.createdAt) }}</time>
              </div>
            </div>
            <p
              v-else
              class="detail-empty"
            >
              暂无管理操作记录
            </p>
            <UButton v-if="detail.nextAuditCursor" size="sm" color="neutral" variant="outline" :loading="auditLoading" @click="loadMoreAudit">加载更早记录</UButton>
          </section>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserOverview,
  PaginationPayload,
  UserRolePayload,
  UserStatusPayload
} from '~~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import type { AccountSnapshot, AdminUserAuditItem } from '~~/types/dto/user'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const pageSize = 20
const page = ref(Math.max(1, Number(route.query.page) || 1))
const searchInput = ref(typeof route.query.search === 'string' ? route.query.search : '')
const search = ref(searchInput.value)
const role = ref(
  typeof route.query.role === 'string' && ['ADMIN', 'USER'].includes(route.query.role)
    ? route.query.role
    : 'ALL'
)
const status = ref(
  typeof route.query.status === 'string' && ['ACTIVE', 'DISABLED'].includes(route.query.status)
    ? route.query.status
    : 'ALL'
)
const sort = ref(
  typeof route.query.sort === 'string' &&
    ['createdAt_desc', 'createdAt_asc', 'lastLoginAt_desc', 'username_asc'].includes(route.query.sort)
    ? route.query.sort
    : 'createdAt_desc'
)

const roleFilters = [
  { label: '全部角色', value: 'ALL' },
  { label: '管理员', value: 'ADMIN' },
  { label: '普通用户', value: 'USER' }
]
const statusFilters = [
  { label: '全部状态', value: 'ALL' },
  { label: '正常', value: 'ACTIVE' },
  { label: '已禁用', value: 'DISABLED' }
]
const sortOptions = [
  { label: '最新注册', value: 'createdAt_desc' },
  { label: '最早注册', value: 'createdAt_asc' },
  { label: '最近登录', value: 'lastLoginAt_desc' },
  { label: '用户名', value: 'username_asc' }
]
const roleOptions = roleFilters.slice(1)
const statusOptions = statusFilters.slice(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    page.value = 1
  }, 300)
})
watch([role, status, sort], () => {
  page.value = 1
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const query = computed(() => ({
  page: page.value,
  pageSize,
  search: search.value || undefined,
  role: role.value === 'ALL' ? undefined : role.value,
  status: status.value === 'ALL' ? undefined : status.value,
  sort: sort.value
}))

const { data, pending, refresh, error } = await useFetch<{ data: PaginationPayload<AdminUserListItem> }>(
  '/api/admin/users',
  { query }
)
const { data: overviewData, refresh: refreshOverview } = await useFetch<{ data: AdminUserOverview }>(
  '/api/admin/users/overview'
)
const { data: sessionData } = await useFetch<{ data: AccountSnapshot }>('/api/auth/me')
const emailAvailable = computed(() => sessionData.value?.data.emailAvailable === true)
const users = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const overview = computed(
  () =>
    overviewData.value?.data || {
      total: 0,
      active: 0,
      disabled: 0,
      admins: 0,
      newThisMonth: 0,
      aiUsageThisMonth: 0
    }
)
const currentUserId = computed(() => sessionData.value?.data.user?.id)

watch(
  query,
  (value) =>
    router.replace({
      query: {
        ...(value.page > 1 ? { page: String(value.page) } : {}),
        ...(value.search ? { search: value.search } : {}),
        ...(value.role ? { role: value.role } : {}),
        ...(value.status ? { status: value.status } : {}),
        ...(value.sort !== 'createdAt_desc' ? { sort: value.sort } : {})
      }
    }),
  { deep: true }
)
watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

const createOpen = ref(false)
const passwordOpen = ref(false)
const detailOpen = ref(false)
const saving = ref(false)
const actionUserId = ref<number | null>(null)
const formError = ref('')
type ManagementAction = {
  user: AdminUserListItem
  field: 'role' | 'status'
  value: UserRolePayload | UserStatusPayload
  title: string
  before: string
  after: string
  danger?: boolean
}
const managementOpen = ref(false)
const managementAction = ref<ManagementAction>()
const createForm = reactive<{
  username: string
  email: string
  password: string
  role: UserRolePayload
  status: UserStatusPayload
  invite: boolean
}>({ username: '', email: '', password: '', role: 'USER', status: 'ACTIVE', invite: false })
const passwordTarget = ref<AdminUserListItem | null>(null)
const passwordForm = reactive({ password: '', confirmPassword: '' })
const canEmailReset = computed(() => emailAvailable.value && !!passwordTarget.value?.emailVerifiedAt && passwordTarget.value.status === 'ACTIVE')
const emailReset = ref(false)
const detail = ref<AdminUserDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const auditLoading = ref(false)
let detailId: number | undefined
let detailRequest: AbortController | undefined

watch(detailOpen, (open) => {
  if (!open) detailRequest?.abort()
})
onBeforeUnmount(() => detailRequest?.abort())

function openCreate() {
  Object.assign(createForm, { username: '', email: '', password: '', role: 'USER', status: 'ACTIVE', invite: emailAvailable.value })
  formError.value = ''
  createOpen.value = true
}
function openPassword(user: AdminUserListItem) {
  passwordTarget.value = user
  emailReset.value = canEmailReset.value
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  formError.value = ''
  passwordOpen.value = true
}

function filterUsers(nextRole: string, nextStatus: string) {
  role.value = nextRole
  status.value = nextStatus
}
function resetFilters() {
  searchInput.value = ''
  search.value = ''
  role.value = 'ALL'
  status.value = 'ALL'
  sort.value = 'createdAt_desc'
  page.value = 1
}
function userActions(user: AdminUserListItem): DropdownMenuItem[][] {
  const isSelf = user.id === currentUserId.value
  const busy = actionUserId.value !== null
  return [
    [{ label: '重置密码', icon: 'i-lucide-key-round', disabled: busy, onSelect: () => openPassword(user) }],
    ...(emailAvailable.value && user.status === 'ACTIVE' && !user.lastLoginAt && !user.emailVerifiedAt && user.pendingEmail
      ? [[{ label: '重发邀请', icon: 'i-lucide-mail', disabled: busy, onSelect: () => sendInvitation(user) }]]
      : []),
    [
      {
        label: user.role === 'ADMIN' ? '降为普通用户' : '设为管理员',
        icon: 'i-lucide-shield',
        disabled: isSelf || busy,
        onSelect: () => {
          void toggleRole(user)
        }
      },
      {
        label: user.status === 'ACTIVE' ? '禁用账号' : '启用账号',
        icon: user.status === 'ACTIVE' ? 'i-lucide-user-x' : 'i-lucide-user-check',
        color: user.status === 'ACTIVE' ? 'error' : 'neutral',
        disabled: isSelf || busy,
        onSelect: () => {
          void toggleStatus(user)
        }
      }
    ],
    ...(isSelf ? [[{ label: '当前登录账号', type: 'label' as const }]] : [])
  ]
}

async function createUser() {
  saving.value = true
  formError.value = ''
  try {
    const invite = createForm.invite && createForm.status === 'ACTIVE'
    const result = await $fetch<{ data: { invitationSent: boolean } }>('/api/admin/users', {
      method: 'POST',
      body: { ...createForm, invite, password: invite ? undefined : createForm.password }
    })
    createOpen.value = false
    toast.add({
      title: invite ? (result.data.invitationSent ? '用户已创建，邀请已发送' : '用户已创建，邮件发送失败，可从列表重发邀请') : '用户已创建',
      color: invite && !result.data.invitationSent ? 'warning' : 'success'
    })
    await refreshAll()
  } catch (error) {
    formError.value = getApiErrorMessage(error, { fallback: '创建用户失败' })
  } finally {
    saving.value = false
  }
}

async function resetPassword() {
  if (!passwordTarget.value) return
  if (!emailReset.value && passwordForm.password !== passwordForm.confirmPassword) {
    formError.value = '两次输入的密码不一致'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const { id } = passwordTarget.value
    if (emailReset.value) await $fetch(`/api/admin/users/${id}/email`, { method: 'POST', body: { purpose: 'RESET' } })
    else await $fetch(`/api/admin/users/${id}/password`, { method: 'PUT', body: passwordForm })
    passwordOpen.value = false
    toast.add({ title: emailReset.value ? '重置邮件已发送' : '密码已重置，旧会话已结束', color: 'success' })
    if (id === currentUserId.value && !emailReset.value) {
      await navigateTo({ path: '/admin/login', query: { redirect: route.fullPath } })
    }
  } catch (error) {
    formError.value = getApiErrorMessage(error, { fallback: '重置密码失败' })
  } finally {
    saving.value = false
  }
}

function toggleRole(user: AdminUserListItem) {
  const nextRole: UserRolePayload = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
  managementAction.value = { user, field: 'role', value: nextRole, title: '变更用户角色？', before: roleLabel(user.role), after: roleLabel(nextRole), danger: true }
  managementOpen.value = true
}

function toggleStatus(user: AdminUserListItem) {
  const nextStatus: UserStatusPayload = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  managementAction.value = { user, field: 'status', value: nextStatus, title: '变更账号状态？', before: statusLabel(user.status), after: statusLabel(nextStatus), danger: nextStatus === 'DISABLED' }
  managementOpen.value = true
}

async function confirmManagementAction() {
  const action = managementAction.value
  if (!action || actionUserId.value !== null) return
  actionUserId.value = action.user.id
  try {
    await $fetch(`/api/admin/users/${action.user.id}/${action.field}`, { method: 'PUT', body: { [action.field]: action.value } })
    managementOpen.value = false
    toast.add({ title: '账号已更新', color: 'success' })
    await refreshAll()
    if (detailOpen.value && detailId === action.user.id) await loadDetail(action.user.id)
  } catch (error) {
    toast.add({ title: getApiErrorMessage(error, { fallback: '操作失败' }), color: 'error' })
  } finally {
    actionUserId.value = null
  }
}

async function sendInvitation(user: AdminUserListItem) {
  if (actionUserId.value !== null) return
  actionUserId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}/email`, { method: 'POST', body: { purpose: 'INVITE' } })
    toast.add({ title: '邀请已发送', color: 'success' })
  } catch (error) {
    toast.add({ title: getApiErrorMessage(error, { fallback: '操作失败' }), color: 'error' })
  } finally {
    actionUserId.value = null
  }
}

async function openDetail(user: AdminUserListItem) {
  detailOpen.value = true
  await loadDetail(user.id)
}
async function loadDetail(id: number) {
  detailRequest?.abort()
  const request = new AbortController()
  detailRequest = request
  detailId = id
  detailError.value = ''
  auditLoading.value = false
  detailLoading.value = true
  detail.value = null
  try {
    const result = await $fetch<{ data: AdminUserDetail }>(`/api/admin/users/${id}`, { signal: request.signal })
    if (!request.signal.aborted) detail.value = result.data
  } catch (error) {
    if (!request.signal.aborted) detailError.value = getApiErrorMessage(error, { fallback: '加载用户详情失败' })
  } finally {
    if (detailRequest === request) detailLoading.value = false
  }
}
function retryDetail() {
  if (detailId !== undefined) void loadDetail(detailId)
}

async function loadMoreAudit() {
  const user = detail.value
  const request = detailRequest
  if (!user?.nextAuditCursor || !request || auditLoading.value) return
  auditLoading.value = true
  try {
    const { data } = await $fetch<{ data: { items: AdminUserAuditItem[], nextCursor: number | null } }>(`/api/admin/users/${user.id}/audit`, {
      query: { cursor: user.nextAuditCursor }, signal: request.signal
    })
    if (!request.signal.aborted && detail.value?.id === user.id) {
      detail.value.recentAuditLogs.push(...data.items)
      detail.value.nextAuditCursor = data.nextCursor
    }
  } catch (error) {
    if (!request.signal.aborted) toast.add({ title: getApiErrorMessage(error, { fallback: '加载管理记录失败' }), color: 'error' })
  } finally {
    if (detailRequest === request) auditLoading.value = false
  }
}

function auditChange(log: AdminUserAuditItem) {
  const before = log.before as { role?: string, status?: string } | null
  const after = log.after as { role?: string, status?: string } | null
  if (before?.role && after?.role) return `${roleLabel(before.role)} → ${roleLabel(after.role)}`
  if (before?.status && after?.status) return `${statusLabel(before.status)} → ${statusLabel(after.status)}`
  return ''
}
async function refreshAll() {
  await Promise.all([refresh(), refreshOverview()])
}
function roleLabel(value: string) {
  return value === 'ADMIN' ? '管理员' : '普通用户'
}
function statusLabel(value: string) {
  return value === 'ACTIVE' ? '正常' : '已禁用'
}
function auditLabel(value: string) {
  return (
    (
      {
        USER_CREATED: '创建用户',
        USER_ROLE_CHANGED: '修改角色',
        USER_STATUS_CHANGED: '修改状态',
        USER_PASSWORD_RESET: '重置密码',
        USER_RESET_SENT: '发送重置邮件',
        USER_INVITE_SENT: '发送账号邀请'
      } as Record<string, string>
    )[value] || value
  )
}
function aiStatusLabel(value: string) {
  return ({ SUCCESS: '成功', FAILED: '失败', BLOCKED: '被拦截', PENDING: '待结算' } as Record<string, string>)[value] || value
}
function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '从未登录'
}
function formatLastLogin(value?: string | Date | null) {
  return value
    ? new Date(value).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    : '尚未登录'
}
function formatDateTime(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '从未登录'
}
function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}
</script>

<style scoped>
.users-page {
  display: grid;
  gap: 24px;
}
.users-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 24px 8px;
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #fff;
}
.users-stats button {
  display: grid;
  gap: 12px;
  border-right: 1px solid var(--admin-line);
  padding: 0 24px;
  text-align: left;
  cursor: pointer;
}
.users-stats button:last-child {
  border: 0;
}
.users-stats span {
  color: var(--admin-muted);
  font-size: 12px;
}
.users-stats strong {
  font-size: 28px;
  line-height: 1.1;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.users-stats small {
  color: var(--admin-muted);
  font-size: 11px;
}
.users-stats button:hover strong {
  color: var(--admin-accent);
}
.users-panel {
  overflow: hidden;
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #fff;
}
.users-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--admin-line);
}
.users-search {
  flex: 1;
  min-width: 200px;
}
.users-filter {
  width: 130px;
}
.users-sort {
  width: 145px;
}
.users-state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px;
  color: var(--admin-muted);
  font-size: 12px;
}
.users-state strong {
  color: var(--admin-ink);
  font-size: 14px;
  font-weight: 500;
}
.users-spin {
  width: 22px;
  height: 22px;
  animation: user-spin 1s linear infinite;
}
@keyframes user-spin {
  to {
    transform: rotate(360deg);
  }
}
.users-table-wrap {
  overflow-x: auto;
}
.users-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}
.users-table thead {
  background: #fafbfc;
  color: var(--admin-muted);
  font-size: 11px;
}
.users-table th {
  height: 38px;
  padding: 10px 18px;
  font-weight: 450;
}
.users-table td {
  padding: 17px 18px;
  border-bottom: 1px solid #eef0f3;
  color: #667085;
  font-size: 12px;
}
.users-table th:first-child,
.users-table td:first-child {
  padding-left: 24px;
}
.users-table tbody tr:hover {
  background: #faf9fc;
}
.user-identity {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
}
.user-identity strong {
  display: block;
  color: var(--admin-ink);
  font-size: 13px;
  font-weight: 500;
}
.user-identity small {
  display: block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
  color: var(--admin-muted);
  font-size: 11px;
}
.user-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 5px;
  background: #f3f4f6;
  color: #667085;
  font-size: 11px;
}
.user-badge.is-admin {
  background: #f0edf8;
  color: #76629d;
}
.user-badge.is-active {
  background: #edf6f0;
  color: #327750;
}
.user-badge.is-disabled {
  background: #fbefef;
  color: #a96060;
}
.user-actions-heading {
  text-align: right;
}
.user-actions {
  display: flex;
  justify-content: flex-end;
  gap: 3px;
}
.users-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  color: var(--admin-muted);
  font-size: 11px;
}
.users-pagination-actions {
  display: flex;
  gap: 8px;
}
.users-cards {
  display: none;
}
.user-form {
  display: grid;
  gap: 20px;
}
.user-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.user-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #e4e7ec;
  padding-top: 20px;
}
.user-form-error {
  padding: 10px 12px;
  border-radius: 5px;
  background: #fcf1f1;
  color: #a14545;
  font-size: 12px;
}
.user-detail {
  display: grid;
  gap: 28px;
}
.detail-profile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
}
.detail-profile h2 {
  font-size: 18px;
  font-weight: 550;
  margin: 0;
}
.detail-profile p {
  margin: 5px 0 12px;
  color: #667085;
  font-size: 12px;
}
.detail-profile dl {
  grid-column: 1/-1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ec;
}
.detail-profile dt,
.detail-stats small {
  color: #667085;
  font-size: 11px;
}
.detail-profile dd {
  margin: 7px 0 0;
  font-size: 12px;
}
.user-detail h3 {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 550;
}
.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.detail-stats > div {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e4e7ec;
  border-radius: 7px;
  background: #fafbfc;
}
.detail-stats strong {
  font-size: 22px;
  font-weight: 500;
}
.detail-logs > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef0f3;
}
.detail-logs strong {
  font-size: 12px;
  font-weight: 500;
}
.detail-logs small {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 11px;
}
.detail-logs time,
.detail-empty {
  color: #667085;
  font-size: 11px;
}
@media (max-width: 1150px) {
  .users-table th:nth-child(6),
  .users-table td:nth-child(6) {
    display: none;
  }
  .users-table th,
  .users-table td {
    padding-inline: 12px;
  }
}
@media (max-width: 900px) {
  .users-table-wrap {
    display: none;
  }
  .users-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 20px;
  }
  .user-card {
    padding: 18px;
    border: 1px solid var(--admin-line);
    border-radius: 8px;
  }
  .user-card-badges {
    display: flex;
    gap: 6px;
    margin-top: 14px;
  }
  .user-card dl {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin: 16px 0;
  }
  .user-card dt {
    color: var(--admin-muted);
    font-size: 11px;
  }
  .user-card dd {
    margin: 5px 0 0;
    font-size: 12px;
  }
  .user-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--admin-line);
  }
  .users-search {
    flex-basis: 100%;
  }
  .users-filter,
  .users-sort {
    flex: 1;
  }
}
@media (max-width: 640px) {
  .users-stats {
    grid-template-columns: 1fr 1fr;
    padding: 0 18px;
  }
  .users-stats button {
    padding: 20px 5px;
  }
  .users-stats button:nth-child(even) {
    border-right: 0;
    padding-left: 20px;
  }
  .users-stats button:nth-child(n + 3) {
    border-top: 1px solid var(--admin-line);
  }
  .users-stats small {
    font-size: 10px;
  }
  .users-cards {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .users-toolbar {
    padding: 16px;
  }
  .users-pagination {
    flex-wrap: wrap;
    padding: 16px;
  }
  .detail-profile dl {
    grid-template-columns: 1fr;
  }
}
</style>
