<template>
  <div class="knowledge-page">
    <AdminPageActions>
      <template v-if="activeTab === 'config'">
        <span
          class="admin-save-state"
          :class="{ 'is-dirty': configDirty }"
        >
          {{ configDirty ? '有未保存修改' : '已保存' }}
        </span>
        <UButton
          size="sm"
          icon="i-lucide-check"
          :loading="savingConfig"
          :disabled="!configDirty || Boolean(configError)"
          @click="saveConfig"
        >
          保存配置
        </UButton>
      </template>
      <UButton
        v-else-if="activeTab === 'files'"
        icon="i-lucide-upload"
        size="sm"
        :loading="uploadingFile"
        @click="knowledgeFileInput?.click()"
      >
        上传文件
      </UButton>
      <UButton
        v-else
        icon="i-lucide-refresh-cw"
        size="sm"
        color="neutral"
        variant="outline"
        :loading="syncingAll"
        @click="syncAll"
      >
        同步全部
      </UButton>
    </AdminPageActions>
    <nav
      class="knowledge-tabs"
      aria-label="知识库功能"
    >
      <button
        v-for="item in tabs"
        :key="item.value"
        type="button"
        :aria-pressed="activeTab === item.value"
        :class="{ 'is-active': activeTab === item.value }"
        @click="setTab(item.value)"
      >
        <UIcon
          :name="item.icon"
          class="size-4"
        />
        {{ item.label }}
        <span
          v-if="item.value === 'jobs' && overview?.stats.failed"
          class="knowledge-tab-alert"
        >
          {{ overview.stats.failed }}
        </span>
      </button>
    </nav>

    <div
      v-if="activeLoadError"
      class="workspace-error"
      role="alert"
    >
      <span>当前知识库数据加载失败，请重新加载。</span>
      <UButton
        color="neutral"
        variant="outline"
        @click="retryActive"
      >
        重新加载
      </UButton>
    </div>
    <template v-else>
      <section
        v-if="activeTab === 'overview'"
        class="knowledge-view"
      >
        <div class="knowledge-stats">
          <article
            v-for="item in statCards"
            :key="item.label"
          >
            <span :class="item.tone">
              <UIcon
                :name="item.icon"
                class="size-5"
              />
            </span>
            <div>
              <strong>{{ item.value }}</strong>
              <p>{{ item.label }}</p>
            </div>
          </article>
        </div>
        <div
          v-if="overview"
          class="knowledge-overview-meta"
        >
          <span>
            <button
              type="button"
              @click="setTab('content')"
            >
              {{ overview.stats.documents }} 篇文章
            </button>
            ，
            <button
              type="button"
              @click="setTab('files')"
            >
              {{ overview.stats.files }} 个文件
            </button>
            ，{{ number(overview.stats.tokens) }} Token
          </span>
          <span>今日 {{ overview.stats.todayQueries }} 次问答</span>
        </div>
        <div class="knowledge-split">
          <section class="knowledge-panel">
            <header>
              <h2>最近同步任务</h2>
              <button @click="setTab('jobs')">查看全部</button>
            </header>
            <KnowledgeEmpty
              v-if="!overview?.recentJobs.length"
              text="暂无同步任务"
            />
            <div
              v-else
              class="compact-list"
            >
              <div
                v-for="job in overview.recentJobs"
                :key="job.id"
              >
                <span
                  class="status-dot"
                  :class="statusTone(job.status)"
                />
                <div>
                  <strong>{{ job.post?.title || job.knowledgeFile?.name || jobTypeLabel(job.type) }}</strong>
                  <small>{{ formatTime(job.createdAt) }}</small>
                </div>
                <em>{{ jobStatusLabel(job.status) }}</em>
              </div>
            </div>
          </section>
          <section class="knowledge-panel">
            <header>
              <h2>最近问答</h2>
              <button @click="setTab('queries')">查看全部</button>
            </header>
            <KnowledgeEmpty
              v-if="!overview?.recentQueries.length"
              text="暂无问答记录"
            />
            <div
              v-else
              class="compact-list"
            >
              <div
                v-for="query in overview.recentQueries"
                :key="query.id"
              >
                <span
                  class="status-dot"
                  :class="statusTone(query.status)"
                />
                <div>
                  <strong>{{ query.question }}</strong>
                  <small>{{ formatTime(query.createdAt) }}</small>
                </div>
                <em>{{ query.durationMs ? `${query.durationMs}ms` : '-' }}</em>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section
        v-else-if="activeTab === 'files'"
        class="knowledge-view"
      >
        <section class="knowledge-panel file-panel">
          <header>
            <div>
              <h2>上传知识文件</h2>
              <p>支持 Markdown、TXT、PDF、DOCX，最大 10MB。上传后会自动建立索引。</p>
            </div>
            <div>
              <input
                ref="knowledgeFileInput"
                class="hidden"
                type="file"
                accept=".md,.txt,.pdf,.docx"
                @change="uploadKnowledgeFile"
              >
            </div>
          </header>
          <KnowledgeEmpty
            v-if="!knowledgeFiles.length"
            text="暂无上传的知识文件"
          />
          <div
            v-for="file in knowledgeFiles"
            :key="file.id"
            class="file-row"
          >
            <div class="file-icon">
              <UIcon
                :name="fileIcon(file.extension)"
                class="size-5"
              />
            </div>
            <div>
              <strong>{{ file.name }}</strong>
              <small>
                {{ file.extension.toUpperCase() }} · {{ formatBytes(file.size) }} ·
                {{ file.chunkCount }} 个分块
              </small>
              <small
                v-if="file.lastError"
                class="error-text"
              >
                {{ file.lastError }}
              </small>
            </div>
            <span
              class="knowledge-badge"
              :class="statusTone(file.status)"
            >
              {{ documentStatusLabel(file.status) }}
            </span>
            <div class="knowledge-actions">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-list-tree"
                @click="showKnowledgeFile(file.id)"
              >
                分块
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-refresh-cw"
                :loading="syncingFileId === file.id"
                @click="syncKnowledgeFile(file.id)"
              >
                同步
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                @click="removeKnowledgeFile(file.id)"
              >
                删除
              </UButton>
            </div>
          </div>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'content'"
        class="knowledge-view"
      >
        <div class="knowledge-toolbar">
          <UInput
            v-model="documentSearch"
            icon="i-lucide-search"
            placeholder="搜索知识文章"
            aria-label="搜索知识文章"
            @keyup.enter="refreshDocuments()"
          />
          <USelect
            v-model="documentStatus"
            :items="statusOptions"
            aria-label="知识文章状态"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-rotate-cw"
            @click="refreshDocuments()"
          >
            刷新
          </UButton>
        </div>
        <section class="knowledge-panel knowledge-table-panel">
          <div class="knowledge-table head">
            <span>文章</span>
            <span>状态</span>
            <span>分块 / Token</span>
            <span>最后同步</span>
            <span>操作</span>
          </div>
          <KnowledgeEmpty
            v-if="!documents.length"
            text="暂无知识文章，请从文章管理中加入知识库"
          />
          <div
            v-for="item in documents"
            :key="item.id"
            class="knowledge-table row"
          >
            <div class="document-name">
              <strong>{{ item.post.title }}</strong>
              <small>{{ item.embeddingModel || '尚未生成向量' }}</small>
              <small
                v-if="item.lastError"
                class="error-text"
              >
                {{ item.lastError }}
              </small>
            </div>
            <span
              class="knowledge-badge"
              :class="statusTone(item.status)"
            >
              {{ documentStatusLabel(item.status) }}
            </span>
            <div class="document-metric">
              <strong>{{ item.chunkCount }}</strong>
              <small>{{ number(item.tokenCount) }} Token</small>
            </div>
            <span class="muted">{{ item.lastIndexedAt ? formatTime(item.lastIndexedAt) : '-' }}</span>
            <div class="knowledge-actions">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-list-tree"
                @click="showDocument(item.postId)"
              >
                分块
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-refresh-cw"
                :loading="syncingPostId === item.postId"
                @click="syncPost(item.postId)"
              >
                同步
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-power"
                @click="disablePost(item.postId)"
              >
                停用
              </UButton>
            </div>
          </div>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'retrieval'"
        class="knowledge-view"
      >
        <section class="knowledge-panel retrieval-form">
          <header>
            <div>
              <h2>检索测试</h2>
              <p>验证召回结果、分块质量和最终回答</p>
            </div>
          </header>
          <UTextarea
            v-model="retrievalQuery"
            :rows="3"
            placeholder="输入一个与博客内容有关的问题"
          />
          <div class="retrieval-controls">
            <UFormField label="召回数量 TopK">
              <UInput
                v-model.number="retrievalTopK"
                type="number"
                min="1"
                max="40"
              />
            </UFormField>
            <label>
              <input
                v-model="generateAnswer"
                type="checkbox"
              >
              同时生成回答
            </label>
            <UButton
              icon="i-lucide-play"
              :loading="testingRetrieval"
              :disabled="!retrievalQuery.trim()"
              @click="runRetrieval"
            >
              开始检索
            </UButton>
          </div>
        </section>
        <div
          v-if="retrievalResult"
          class="knowledge-split retrieval-results"
        >
          <section class="knowledge-panel">
            <header>
              <h2>召回结果</h2>
              <span>{{ retrievalResult.results.length }} 条</span>
            </header>
            <div class="result-list">
              <article
                v-for="(item, index) in retrievalResult.results"
                :key="`${item.sourceType}-${item.chunkId}`"
              >
                <div>
                  <b>{{ Number(index) + 1 }}</b>
                  <strong>{{ item.title }}</strong>
                  <em>{{ item.score.toFixed(4) }}</em>
                </div>
                <small>
                  {{ item.sourceType === 'FILE' ? '文件' : '文章' }} · Chunk #{{ item.chunkIndex + 1 }} ·
                  {{ item.headingPath || (item.pageNumber ? `第 ${item.pageNumber} 页` : '正文') }}
                </small>
                <p>{{ item.excerpt }}</p>
              </article>
            </div>
          </section>
          <section class="knowledge-panel answer-panel">
            <header>
              <h2>最终回答</h2>
              <span>{{ retrievalResult.metrics.durationMs }}ms</span>
            </header>
            <p>{{ retrievalResult.answer?.answer || '未生成回答' }}</p>
            <div
              v-if="retrievalResult.answer?.citations.length"
              class="citation-list"
            >
              <strong>引用来源</strong>
              <span
                v-for="item in retrievalResult.answer.citations"
                :key="`${item.sourceType}-${item.postId || item.knowledgeFileId}-${item.headingPath}-${item.pageNumber}`"
              >
                {{ item.title }} ·
                {{ item.headingPath || (item.pageNumber ? `第 ${item.pageNumber} 页` : '正文') }}
              </span>
            </div>
            <dl>
              <div>
                <dt>检索耗时</dt>
                <dd>{{ retrievalResult.metrics.retrievalMs }}ms</dd>
              </div>
              <div>
                <dt>模型耗时</dt>
                <dd>{{ retrievalResult.metrics.modelMs }}ms</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <section
        v-else-if="activeTab === 'queries'"
        class="knowledge-view"
      >
        <section class="knowledge-panel knowledge-table-panel">
          <header>
            <h2>问答记录</h2>
            <span>最近 100 条</span>
          </header>
          <KnowledgeEmpty
            v-if="!queryLogs.length"
            text="暂无问答记录"
          />
          <div
            v-for="item in queryLogs"
            :key="item.id"
            class="log-row"
          >
            <span
              class="knowledge-badge"
              :class="statusTone(item.status)"
            >
              {{ queryStatusLabel(item.status) }}
            </span>
            <div>
              <strong>{{ item.question }}</strong>
              <p v-if="item.answer">{{ item.answer }}</p>
              <small>{{ item.user?.username || '未知用户' }} · {{ formatTime(item.createdAt) }}</small>
            </div>
            <em>{{ item.durationMs ? `${item.durationMs}ms` : '-' }}</em>
          </div>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'jobs'"
        class="knowledge-view"
      >
        <section class="knowledge-panel knowledge-table-panel">
          <header>
            <h2>同步任务</h2>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              @click="refreshJobs()"
            >
              刷新状态
            </UButton>
          </header>
          <KnowledgeEmpty
            v-if="!jobs.length"
            text="暂无同步任务"
          />
          <div
            v-for="job in jobs"
            :key="job.id"
            class="job-row"
          >
            <span
              class="knowledge-badge"
              :class="statusTone(job.status)"
            >
              {{ jobStatusLabel(job.status) }}
            </span>
            <div>
              <strong>{{ job.post?.title || job.knowledgeFile?.name || jobTypeLabel(job.type) }}</strong>
              <p>
                {{ job.completedItems }}/{{ job.totalItems }} 完成 · 成功 {{ job.successItems }} · 失败
                {{ job.failedItems }}
              </p>
              <small>{{ formatTime(job.createdAt) }}</small>
              <small
                v-if="job.error"
                class="error-text"
              >
                {{ job.error }}
              </small>
              <UButton
                v-if="job.postId && ['FAILED', 'PARTIAL_FAILED'].includes(job.status)"
                size="xs"
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                :loading="syncingPostId === job.postId"
                @click="syncPost(job.postId)"
              >
                重试同步
              </UButton>
            </div>
          </div>
        </section>
      </section>

      <section
        v-else
        class="knowledge-view"
      >
        <div class="config-layout workspace-editor-layout">
          <nav
            class="config-switcher workspace-settings-nav"
            aria-label="模型与检索配置分类"
          >
            <button
              v-for="item in configTabs"
              :key="item.value"
              type="button"
              :class="{ 'is-active': activeConfigTab === item.value }"
              @click="activeConfigTab = item.value"
            >
              <UIcon
                :name="item.icon"
                class="size-4"
              />
              <span>{{ item.label }}</span>
            </button>
          </nav>
          <section class="knowledge-panel config-panel">
            <header>
              <div>
                <h2>{{ currentConfigTab.label }}</h2>
                <p>{{ currentConfigTab.description }}</p>
              </div>
            </header>
            <div
              v-if="activeConfigTab === 'chat'"
              class="config-fields"
            >
              <AdminKnowledgeConfigField
                label="API 密钥"
                description="用于调用对话模型；服务器环境变量优先于此处配置。"
                icon="i-lucide-key-round"
              >
                <UInput
                  v-model="configForm.ai_api_key"
                  type="password"
                  icon="i-lucide-lock-keyhole"
                  placeholder="留空则使用环境变量"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="服务地址"
                description="兼容 OpenAI Chat Completions 协议的 API 地址。"
                icon="i-lucide-globe-2"
              >
                <UInput
                  v-model="configForm.ai_base_url"
                  icon="i-lucide-link"
                  placeholder="https://api.deepseek.com"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="模型名称"
                description="承担知识库问答和其他 AI 内容生成任务。"
                icon="i-lucide-cpu"
              >
                <UInput
                  v-model="configForm.ai_model"
                  icon="i-lucide-sparkles"
                  placeholder="deepseek-v4-flash"
                />
              </AdminKnowledgeConfigField>
            </div>
            <div
              v-else-if="activeConfigTab === 'embedding'"
              class="config-fields"
            >
              <AdminKnowledgeConfigField
                label="Embedding 密钥"
                description="用于生成文章和文件向量；环境变量配置优先。"
                icon="i-lucide-key-round"
              >
                <UInput
                  v-model="configForm.ai_embedding_api_key"
                  type="password"
                  icon="i-lucide-lock-keyhole"
                  placeholder="留空则使用环境变量"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="Embedding 地址"
                description="兼容 OpenAI Embeddings 协议的 API 地址。"
                icon="i-lucide-globe-2"
              >
                <UInput
                  v-model="configForm.ai_embedding_base_url"
                  icon="i-lucide-link"
                  placeholder="https://api.openai.com/v1"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="Embedding 模型"
                description="更换模型后，已有知识需要执行一次全量同步。"
                icon="i-lucide-brain-circuit"
              >
                <UInput
                  v-model="configForm.ai_embedding_model"
                  icon="i-lucide-box"
                  placeholder="text-embedding-3-small"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="向量维度"
                description="数据库向量列当前固定为 1536 维，不可在界面直接修改。"
                icon="i-lucide-ruler"
              >
                <UInput
                  v-model="configForm.ai_embedding_dimensions"
                  icon="i-lucide-binary"
                  disabled
                />
              </AdminKnowledgeConfigField>
            </div>
            <div
              v-else-if="activeConfigTab === 'rerank'"
              class="config-fields"
            >
              <AdminKnowledgeConfigField
                label="精排状态"
                description="启用后会对混合检索候选结果进行二次排序。"
                icon="i-lucide-toggle-right"
              >
                <USelect
                  v-model="configForm.ai_rerank_enabled"
                  :items="booleanOptions"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="Rerank 密钥"
                description="未配置密钥时系统会自动跳过精排。"
                icon="i-lucide-key-round"
              >
                <UInput
                  v-model="configForm.ai_rerank_api_key"
                  type="password"
                  icon="i-lucide-lock-keyhole"
                  placeholder="留空则使用环境变量"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="Rerank 地址"
                description="支持 Cohere 兼容接口或 DashScope 完整端点。"
                icon="i-lucide-globe-2"
              >
                <UInput
                  v-model="configForm.ai_rerank_base_url"
                  icon="i-lucide-link"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="Rerank 模型"
                description="用于判断问题与候选知识片段的相关性。"
                icon="i-lucide-list-filter"
              >
                <UInput
                  v-model="configForm.ai_rerank_model"
                  icon="i-lucide-box"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="输出数量"
                description="建议设置为 5–10；越大覆盖越广，但延迟也越高。"
                icon="i-lucide-list-ordered"
              >
                <UInput
                  v-model="configForm.ai_rerank_top_n"
                  type="number"
                  min="1"
                  max="20"
                />
              </AdminKnowledgeConfigField>
            </div>
            <div
              v-else
              class="config-fields"
            >
              <AdminKnowledgeConfigField
                label="召回数量 TopK"
                description="混合检索阶段最多保留的候选知识片段数量。"
                icon="i-lucide-search"
              >
                <UInput
                  v-model="configForm.rag_top_k"
                  type="number"
                  min="1"
                  max="40"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="上下文数量"
                description="最终发送给对话模型的知识片段上限。"
                icon="i-lucide-layers-3"
              >
                <UInput
                  v-model="configForm.rag_context_limit"
                  type="number"
                  min="1"
                  max="20"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="用户每日限额"
                description="限制单个登录用户每天可发起的知识库问答次数。"
                icon="i-lucide-user-round-check"
              >
                <UInput
                  v-model="configForm.rag_daily_user_limit"
                  type="number"
                  min="1"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="IP 每小时限额"
                description="防止同一来源短时间内频繁调用并产生额外费用。"
                icon="i-lucide-shield-check"
              >
                <UInput
                  v-model="configForm.rag_ip_hourly_limit"
                  type="number"
                  min="1"
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="问答系统 Prompt"
                description="约束回答范围、风格和引用规则；修改前建议先在检索测试中验证。"
                icon="i-lucide-message-square-code"
                wide
              >
                <UTextarea
                  v-model="configForm.rag_system_prompt"
                  :rows="5"
                  autoresize
                />
              </AdminKnowledgeConfigField>
              <AdminKnowledgeConfigField
                label="无答案提示"
                description="当知识库没有足够依据时展示给用户的兜底文案。"
                icon="i-lucide-message-circle-question"
                wide
              >
                <UTextarea
                  v-model="configForm.rag_no_answer_prompt"
                  :rows="3"
                  autoresize
                />
              </AdminKnowledgeConfigField>
            </div>
          </section>
        </div>
      </section>
    </template>
    <USlideover
      :open="Boolean(selectedFile || selectedDocument)"
      :title="selectedFile?.name || selectedDocument?.post.title || '知识分块'"
      :description="`${selectedFile?.chunkCount ?? selectedDocument?.chunkCount ?? 0} 个分块 · ${number(selectedFile?.tokenCount ?? selectedDocument?.tokenCount ?? 0)} Token`"
      :ui="{ content: 'sm:max-w-2xl' }"
      @update:open="
        (value) => {
          if (!value) {
            selectedFile = null
            selectedDocument = null
          }
        }
      "
    >
      <template #body>
        <div class="knowledge-chunks">
          <article
            v-for="chunk in selectedChunks"
            :key="chunk.id"
          >
            <header>
              <span>分块 {{ chunk.chunkIndex + 1 }}</span>
              <small>{{ chunk.tokenCount }} Token</small>
            </header>
            <strong>{{ chunk.headingPath || '正文' }}</strong>
            <p>{{ chunk.content }}</p>
          </article>
          <KnowledgeEmpty
            v-if="!selectedChunks.length"
            text="尚未生成知识分块，请先同步内容"
          />
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { useAdminUnsavedChanges } from '~/composables/useAdminUnsavedChanges'
import type { ApiResult } from '~~/types/api'
import type {
  KnowledgeDocumentItem,
  KnowledgeFileItem,
  KnowledgeJob,
  KnowledgeOverview,
  RagQueryLog
} from '~~/types/dto/knowledge'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const route = useRoute()
const router = useRouter()
const toast = useToast()
const tabs = [
  { label: '概览', value: 'overview', icon: 'i-lucide-layout-dashboard' },
  { label: '文章', value: 'content', icon: 'i-lucide-newspaper' },
  { label: '文件', value: 'files', icon: 'i-lucide-files' },
  { label: '检索测试', value: 'retrieval', icon: 'i-lucide-search-code' },
  { label: '问答记录', value: 'queries', icon: 'i-lucide-messages-square' },
  { label: '同步任务', value: 'jobs', icon: 'i-lucide-list-checks' },
  { label: '模型与检索', value: 'config', icon: 'i-lucide-settings-2' }
] as const
type Tab = (typeof tabs)[number]['value']
const activeTab = computed(() =>
  tabs.some((i) => i.value === route.query.tab) ? (route.query.tab as Tab) : 'overview'
)
const setTab = (tab: Tab) => router.replace({ query: { ...route.query, tab } })
const {
  data: overviewData,
  error: overviewError,
  refresh: refreshOverview
} = await useFetch<ApiResult<KnowledgeOverview>>('/api/admin/knowledge/overview')
const overview = computed(() => overviewData.value?.data)
const documentSearch = ref('')
const documentStatus = ref('__all__')
const documentQuery = computed(() => ({
  search: documentSearch.value || undefined,
  status: documentStatus.value === '__all__' ? undefined : documentStatus.value,
  pageSize: 100
}))
const {
  data: documentData,
  error: documentsError,
  refresh: refreshDocuments
} = await useFetch<ApiResult<{ items: KnowledgeDocumentItem[] }>>('/api/admin/knowledge/documents', {
  query: documentQuery
})
const documents = computed(() => documentData.value?.data.items || [])
const {
  data: fileData,
  error: filesError,
  refresh: refreshFiles
} = await useFetch<ApiResult<{ items: KnowledgeFileItem[] }>>('/api/admin/knowledge/files', {
  query: { pageSize: 100 }
})
const knowledgeFiles = computed(() => fileData.value?.data.items || [])
const {
  data: jobData,
  error: jobsError,
  refresh: refreshJobs
} = await useFetch<ApiResult<KnowledgeJob[]>>('/api/admin/knowledge/jobs')
const jobs = computed(() => jobData.value?.data || [])
const {
  data: queryData,
  error: queriesError,
  refresh: refreshQueries
} = await useFetch<ApiResult<RagQueryLog[]>>('/api/admin/knowledge/queries')
const queryLogs = computed(() => queryData.value?.data || [])
const {
  data: settingsData,
  error: configError,
  refresh: refreshConfig
} = await useFetch<ApiResult<Record<string, string>>>('/api/admin/knowledge/config')
const configForm = reactive({
  ai_api_key: '',
  ai_base_url: 'https://api.deepseek.com',
  ai_model: 'deepseek-v4-flash',
  ai_embedding_api_key: '',
  ai_embedding_base_url: 'https://api.openai.com/v1',
  ai_embedding_model: 'text-embedding-3-small',
  ai_embedding_dimensions: '1536',
  ai_rerank_enabled: 'false',
  ai_rerank_api_key: '',
  ai_rerank_base_url: 'https://api.cohere.com/v2',
  ai_rerank_model: 'rerank-v3.5',
  ai_rerank_top_n: '8',
  rag_top_k: '10',
  rag_context_limit: '8',
  rag_system_prompt: '',
  rag_no_answer_prompt: '',
  rag_daily_user_limit: '20',
  rag_ip_hourly_limit: '60'
})
if (settingsData.value?.data)
  Object.assign(
    configForm,
    Object.fromEntries(
      Object.keys(configForm).map((key) => [
        key,
        settingsData.value!.data[key] || configForm[key as keyof typeof configForm]
      ])
    )
  )
type KnowledgeDetail = KnowledgeDocumentItem & {
  chunks: Array<{
    id: number
    chunkIndex: number
    headingPath?: string | null
    content: string
    tokenCount: number
  }>
}
type KnowledgeFileDetail = KnowledgeFileItem & {
  chunks: Array<{
    id: number
    chunkIndex: number
    headingPath?: string | null
    pageNumber?: number | null
    content: string
    tokenCount: number
  }>
}
type RetrievalResult = {
  results: Array<{
    chunkId: number
    sourceType: 'POST' | 'FILE'
    chunkIndex: number
    title: string
    score: number
    headingPath?: string | null
    pageNumber?: number | null
    excerpt: string
  }>
  answer?: {
    answer: string
    citations: Array<{
      sourceType: 'POST' | 'FILE'
      postId?: number
      knowledgeFileId?: number
      title: string
      headingPath?: string | null
      pageNumber?: number | null
    }>
  } | null
  metrics: { retrievalMs: number; modelMs: number; durationMs: number }
}
const syncingAll = ref(false)
const syncingPostId = ref<number | null>(null)
const selectedDocument = ref<KnowledgeDetail | null>(null)
const knowledgeFileInput = ref<HTMLInputElement | null>(null)
const uploadingFile = ref(false)
const syncingFileId = ref<number | null>(null)
const selectedFile = ref<KnowledgeFileDetail | null>(null)
const retrievalQuery = ref('')
const retrievalTopK = ref(10)
const generateAnswer = ref(true)
const testingRetrieval = ref(false)
const retrievalResult = ref<RetrievalResult | null>(null)
const savingConfig = ref(false)
const statusOptions = [
  { label: '全部状态', value: '__all__' },
  ...['PENDING', 'SYNCING', 'SYNCED', 'STALE', 'FAILED', 'DISABLED'].map((value) => ({
    label: documentStatusLabel(value),
    value
  }))
]
const booleanOptions = [
  { label: '关闭', value: 'false' },
  { label: '开启', value: 'true' }
]
const configTabs = [
  {
    label: '对话模型',
    value: 'chat',
    icon: 'i-lucide-message-square-text',
    description: '用于知识库问答以及摘要、SEO、写作助手等生成能力。'
  },
  {
    label: 'Embedding',
    value: 'embedding',
    icon: 'i-lucide-brain-circuit',
    description: '将博客文章和上传文件转换为语义检索向量。'
  },
  {
    label: 'Rerank',
    value: 'rerank',
    icon: 'i-lucide-list-filter',
    description: '对混合检索候选结果二次排序，减少问答上下文噪声。'
  },
  {
    label: 'RAG 策略',
    value: 'rag',
    icon: 'i-lucide-sliders-horizontal',
    description: '控制召回、上下文、问答提示词和访问限额。'
  }
] as const
const activeConfigTab = ref<(typeof configTabs)[number]['value']>('chat')
const currentConfigTab = computed(
  () => configTabs.find((item) => item.value === activeConfigTab.value) || configTabs[0]
)
const statCards = computed(() => {
  const stats = overview.value?.stats
  return [
    {
      label: '知识来源',
      value: (stats?.documents || 0) + (stats?.files || 0),
      icon: 'i-lucide-library',
      tone: 'indigo'
    },
    { label: '有效分块', value: stats?.chunks || 0, icon: 'i-lucide-blocks', tone: 'sky' },
    { label: '待同步', value: stats?.pending || 0, icon: 'i-lucide-clock-3', tone: 'amber' },
    { label: '同步失败', value: stats?.failed || 0, icon: 'i-lucide-circle-alert', tone: 'red' }
  ]
})
async function refreshAll() {
  await Promise.all([refreshOverview(), refreshDocuments(), refreshFiles(), refreshJobs(), refreshQueries()])
}
async function syncAll() {
  syncingAll.value = true
  try {
    const result = await $fetch<ApiResult<{ alreadyRunning: boolean }>>('/api/admin/knowledge/sync-all', {
      method: 'POST'
    })
    toast.add({ title: result.data.alreadyRunning ? '同步任务正在执行' : '同步任务已提交', color: 'success' })
    await refreshAll()
  } catch (error: unknown) {
    toast.add({ title: '提交失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    syncingAll.value = false
  }
}
async function syncPost(postId: number) {
  syncingPostId.value = postId
  try {
    await $fetch(`/api/admin/knowledge/documents/${postId}/sync`, { method: 'POST' })
    toast.add({ title: '文章同步任务已提交', color: 'success' })
    await refreshAll()
  } catch (error: unknown) {
    toast.add({ title: '同步失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    syncingPostId.value = null
  }
}
async function disablePost(postId: number) {
  if (!confirm('停用后将移除该文章的知识分块，原文章会保留。继续吗？')) return
  try {
    await $fetch(`/api/admin/knowledge/documents/${postId}/enabled`, {
      method: 'PUT',
      body: { enabled: false }
    })
    await refreshAll()
    toast.add({ title: '已停用知识索引', color: 'success' })
  } catch (error: unknown) {
    toast.add({ title: '停用失败', description: getApiErrorMessage(error), color: 'error' })
  }
}
async function showDocument(postId: number) {
  try {
    const result = await $fetch<ApiResult<KnowledgeDetail>>(`/api/admin/knowledge/documents/${postId}`)
    selectedFile.value = null
    selectedDocument.value = result.data
  } catch (error: unknown) {
    toast.add({ title: '分块加载失败', description: getApiErrorMessage(error), color: 'error' })
  }
}
async function uploadKnowledgeFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingFile.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    await $fetch('/api/admin/knowledge/files', { method: 'POST', body })
    toast.add({ title: '文件已上传，正在后台同步', color: 'success' })
    await refreshAll()
  } catch (error: unknown) {
    toast.add({ title: '上传失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    uploadingFile.value = false
    input.value = ''
  }
}
async function showKnowledgeFile(id: number) {
  try {
    const result = await $fetch<ApiResult<KnowledgeFileDetail>>(`/api/admin/knowledge/files/${id}`)
    selectedDocument.value = null
    selectedFile.value = result.data
  } catch (error: unknown) {
    toast.add({ title: '分块加载失败', description: getApiErrorMessage(error), color: 'error' })
  }
}
async function syncKnowledgeFile(id: number) {
  syncingFileId.value = id
  try {
    await $fetch(`/api/admin/knowledge/files/${id}/sync`, { method: 'POST' })
    toast.add({ title: '文件同步任务已提交', color: 'success' })
    await refreshAll()
  } catch (error: unknown) {
    toast.add({ title: '同步失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    syncingFileId.value = null
  }
}
async function removeKnowledgeFile(id: number) {
  if (!confirm('删除后将同时移除原文件、知识分块和向量，继续吗？')) return
  try {
    await $fetch(`/api/admin/knowledge/files/${id}`, { method: 'DELETE' })
    if (selectedFile.value?.id === id) selectedFile.value = null
    await refreshAll()
    toast.add({ title: '知识文件已删除', color: 'success' })
  } catch (error: unknown) {
    toast.add({ title: '删除失败', description: getApiErrorMessage(error), color: 'error' })
  }
}
async function runRetrieval() {
  if (!retrievalQuery.value.trim()) return
  testingRetrieval.value = true
  retrievalResult.value = null
  try {
    const result = await $fetch<ApiResult<RetrievalResult>>('/api/admin/knowledge/retrieval-test', {
      method: 'POST',
      body: { query: retrievalQuery.value, topK: retrievalTopK.value, generateAnswer: generateAnswer.value }
    })
    retrievalResult.value = result.data
  } catch (error: unknown) {
    toast.add({ title: '检索失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    testingRetrieval.value = false
  }
}
const {
  isDirty: configDirty,
  markSaved: markConfigSaved,
  snapshot: configSnapshot
} = useAdminUnsavedChanges(() => configForm)
const selectedChunks = computed(() => selectedFile.value?.chunks || selectedDocument.value?.chunks || [])
const activeLoadError = computed(
  () =>
    ({
      overview: overviewError.value,
      content: documentsError.value,
      files: filesError.value,
      jobs: jobsError.value,
      queries: queriesError.value,
      config: configError.value,
      retrieval: null
    })[activeTab.value]
)
async function retryActive() {
  if (activeTab.value === 'config') {
    await refreshConfig()
    if (settingsData.value?.data) {
      Object.assign(configForm, settingsData.value.data)
      markConfigSaved()
    }
  } else await refreshAll()
}
async function saveConfig() {
  if (savingConfig.value || configError.value) return
  const submittedSnapshot = configSnapshot()
  savingConfig.value = true
  try {
    await $fetch('/api/admin/knowledge/config', { method: 'PUT', body: { ...configForm } })
    markConfigSaved(submittedSnapshot)
    toast.add({ id: 'knowledge-config-save', title: 'AI 模型与检索配置已保存', color: 'success' })
  } catch (error: unknown) {
    toast.add({
      id: 'knowledge-config-save',
      title: '保存配置失败',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    savingConfig.value = false
  }
}
function number(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}
function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
function documentStatusLabel(value: string) {
  return (
    (
      {
        PENDING: '待同步',
        SYNCING: '同步中',
        SYNCED: '已同步',
        STALE: '需要更新',
        FAILED: '同步失败',
        DISABLED: '未启用'
      } as Record<string, string>
    )[value] || value
  )
}
function jobStatusLabel(value: string) {
  return (
    (
      {
        PENDING: '等待中',
        RUNNING: '执行中',
        COMPLETED: '已完成',
        PARTIAL_FAILED: '部分失败',
        FAILED: '失败',
        SUCCESS: '成功',
        NO_KNOWLEDGE: '无知识'
      } as Record<string, string>
    )[value] || value
  )
}
function queryStatusLabel(value: string) {
  return (
    ({ SUCCESS: '成功', NO_KNOWLEDGE: '无知识', FAILED: '失败' } as Record<string, string>)[value] || value
  )
}
function jobTypeLabel(value: string) {
  return (
    (
      {
        SINGLE_POST: '单文章同步',
        BATCH_SYNC: '批量同步',
        FULL_REBUILD: '全量重建',
        REMOVE_STALE: '清理失效数据',
        FILE_SYNC: '文件同步'
      } as Record<string, string>
    )[value] || value
  )
}
function statusTone(value: string) {
  return (
    (
      {
        SYNCED: 'is-success',
        COMPLETED: 'is-success',
        SUCCESS: 'is-success',
        SYNCING: 'is-info',
        RUNNING: 'is-info',
        PENDING: 'is-warning',
        STALE: 'is-warning',
        PARTIAL_FAILED: 'is-warning',
        FAILED: 'is-error',
        DISABLED: 'is-muted',
        NO_KNOWLEDGE: 'is-muted'
      } as Record<string, string>
    )[value] || 'is-muted'
  )
}
function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
function fileIcon(extension: string) {
  return (
    (
      {
        pdf: 'i-lucide-file-text',
        docx: 'i-lucide-file-type-2',
        md: 'i-lucide-file-code-2',
        txt: 'i-lucide-file-text'
      } as Record<string, string>
    )[extension] || 'i-lucide-file'
  )
}
</script>

<style scoped>
.knowledge-page {
  display: grid;
  gap: 1rem;
}
.knowledge-header,
.knowledge-title,
.knowledge-tabs,
.knowledge-toolbar,
.knowledge-panel > header,
.retrieval-controls {
  display: flex;
  align-items: center;
}
.knowledge-header {
  justify-content: space-between;
}
.knowledge-title {
  gap: 0.8rem;
}
.knowledge-title > span {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: 10px;
  background: #fff;
  color: #fff;
  box-shadow: none;
}
.knowledge-title p,
.knowledge-title h1 {
  margin: 0;
}
.knowledge-title p {
  color: #6554c0;
  font-size: 0.7rem;
  font-weight: 550;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.knowledge-title h1 {
  font-size: 1.5rem;
}
.knowledge-tabs {
  gap: 0.25rem;
  overflow-x: auto;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
  padding: 0.3rem;
}
.knowledge-tabs button {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  gap: 0.4rem;
  border-radius: 0.62rem;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 550;
  padding: 0 0.8rem;
  white-space: nowrap;
}
.knowledge-tabs button:hover,
.knowledge-tabs button.is-active {
  background: #efedf8;
  color: #6554c0;
}
.knowledge-view {
  display: grid;
  gap: 1rem;
}
.knowledge-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
}
.knowledge-stats article {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
  padding: 0.85rem;
}
.knowledge-stats article > span {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.7rem;
}
.knowledge-stats .indigo {
  background: #efedf8;
  color: #6554c0;
}
.knowledge-stats .sky {
  background: #e0f2fe;
  color: #0284c7;
}
.knowledge-stats .amber {
  background: #fef3c7;
  color: #d97706;
}
.knowledge-stats .red {
  background: #fee2e2;
  color: #dc2626;
}
.knowledge-stats .emerald {
  background: #d1fae5;
  color: #059669;
}
.knowledge-stats .violet {
  background: #f3e8ff;
  color: #9333ea;
}
.knowledge-stats strong,
.knowledge-stats p {
  display: block;
  margin: 0;
}
.knowledge-stats strong {
  font-size: 1.2rem;
}
.knowledge-stats p {
  color: #64748b;
  font-size: 0.72rem;
}
.knowledge-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.knowledge-panel {
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
  box-shadow: none;
}
.knowledge-panel > header {
  justify-content: space-between;
  min-height: 3.4rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eef2f7;
}
.knowledge-panel h2,
.knowledge-panel header p {
  margin: 0;
}
.knowledge-panel h2 {
  font-size: 0.92rem;
}
.knowledge-panel header p {
  margin-top: 0.15rem;
  color: #64748b;
  font-size: 0.72rem;
}
.knowledge-panel header button,
.knowledge-panel header > span {
  color: #6554c0;
  font-size: 0.72rem;
  font-weight: 550;
}
.compact-list {
  padding: 0.35rem 1rem;
}
.compact-list > div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.compact-list > div:last-child {
  border: 0;
}
.compact-list strong,
.compact-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compact-list strong {
  font-size: 0.78rem;
}
.compact-list small {
  margin-top: 0.15rem;
  color: #697386;
  font-size: 0.68rem;
}
.compact-list em {
  color: #64748b;
  font-size: 0.68rem;
  font-style: normal;
}
.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #697386;
}
.status-dot.is-success {
  background: #10b981;
}
.status-dot.is-info {
  background: #3b82f6;
}
.status-dot.is-warning {
  background: #f59e0b;
}
.status-dot.is-error {
  background: #ef4444;
}
.knowledge-toolbar {
  gap: 0.6rem;
}
.knowledge-toolbar > :first-child {
  width: min(22rem, 100%);
}
.knowledge-table {
  display: grid;
  grid-template-columns: minmax(15rem, 2fr) 7rem 8rem 8rem minmax(13rem, 1fr);
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 1rem;
}
.knowledge-table.head {
  border-bottom: 1px solid #e4e7ec;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 550;
}
.knowledge-table.row {
  border-bottom: 1px solid #f1f5f9;
}
.document-name strong,
.document-name small,
.document-metric strong,
.document-metric small {
  display: block;
}
.document-name strong {
  font-size: 0.82rem;
}
.document-name small,
.document-metric small,
.muted {
  margin-top: 0.18rem;
  color: #697386;
  font-size: 0.68rem;
}
.knowledge-badge {
  display: inline-flex;
  width: max-content;
  border-radius: 999px;
  padding: 0.3rem 0.55rem;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 550;
}
.knowledge-badge.is-success {
  background: #d1fae5;
  color: #047857;
}
.knowledge-badge.is-info {
  background: #dbeafe;
  color: #2563eb;
}
.knowledge-badge.is-warning {
  background: #fef3c7;
  color: #b45309;
}
.knowledge-badge.is-error {
  background: #fee2e2;
  color: #dc2626;
}
.knowledge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
}
.chunk-panel > header > div p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.7rem;
}
.chunk-list {
  display: grid;
  gap: 0.65rem;
  max-height: 38rem;
  overflow: auto;
  padding: 0.8rem;
}
.chunk-list article {
  border: 1px solid #e4e7ec;
  border-radius: 0.7rem;
  background: #f8fafc;
  padding: 0.75rem;
}
.chunk-list article > div {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.chunk-list article span {
  flex: 1;
  color: #6554c0;
  font-size: 0.72rem;
}
.chunk-list article em {
  color: #64748b;
  font-size: 0.68rem;
  font-style: normal;
}
.chunk-list article p {
  margin: 0.6rem 0 0;
  color: #475569;
  font-size: 0.76rem;
  line-height: 1.65;
  white-space: pre-wrap;
}
.retrieval-form {
  padding-bottom: 1rem;
}
.retrieval-form > :not(header) {
  margin-right: 1rem;
  margin-left: 1rem;
}
.retrieval-form > header {
  margin-bottom: 1rem;
}
.retrieval-controls {
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 0.75rem;
}
.retrieval-controls > :first-child {
  width: 8rem;
  margin-right: auto;
}
.retrieval-controls label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #475569;
  font-size: 0.78rem;
}
.retrieval-results {
  align-items: start;
}
.result-list {
  display: grid;
  max-height: 48rem;
  overflow: auto;
}
.result-list article {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid #eef2f7;
}
.result-list article > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.result-list b {
  display: grid;
  width: 1.3rem;
  height: 1.3rem;
  place-items: center;
  border-radius: 0.4rem;
  background: #efedf8;
  color: #6554c0;
  font-size: 0.65rem;
}
.result-list strong {
  flex: 1;
  font-size: 0.8rem;
}
.result-list em {
  color: #6554c0;
  font-size: 0.68rem;
  font-style: normal;
}
.result-list small {
  display: block;
  margin: 0.35rem 0;
  color: #697386;
  font-size: 0.68rem;
}
.result-list p,
.answer-panel > p {
  margin: 0;
  color: #475569;
  font-size: 0.75rem;
  line-height: 1.6;
}
.answer-panel > p {
  padding: 1rem;
  font-size: 0.82rem;
  white-space: pre-wrap;
}
.citation-list {
  display: grid;
  gap: 0.35rem;
  margin: 0 1rem;
  padding: 0.75rem;
  border-radius: 0.65rem;
  background: #f8fafc;
}
.citation-list strong {
  font-size: 0.72rem;
}
.citation-list span {
  color: #6554c0;
  font-size: 0.7rem;
}
.answer-panel dl {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  margin: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eef2f7;
}
.answer-panel dl div {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
}
.log-row,
.job-row {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.8rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #eef2f7;
}
.job-row {
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: baseline;
}
.log-row strong,
.log-row p,
.log-row small,
.job-row strong,
.job-row p,
.job-row small {
  display: block;
  margin: 0;
}
.log-row p,
.job-row p {
  margin: 0.3rem 0;
  color: #64748b;
  font-size: 0.73rem;
  line-height: 1.5;
}
.log-row small,
.job-row small {
  color: #697386;
  font-size: 0.68rem;
}
.log-row em {
  color: #64748b;
  font-size: 0.7rem;
  font-style: normal;
}
.error-text {
  margin-top: 0.3rem !important;
  color: #dc2626 !important;
}
.config-panel {
  padding-bottom: 1rem;
}
.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;
}
.config-grid small {
  display: block;
  margin-top: 0.3rem;
  color: #697386;
  font-size: 0.68rem;
}
@media (max-width: 1100px) {
  .knowledge-stats {
    grid-template-columns: repeat(3, 1fr);
  }
  .knowledge-table {
    grid-template-columns: minmax(14rem, 2fr) 7rem 8rem 8rem minmax(12rem, 1fr);
    min-width: 58rem;
  }
  .knowledge-table-panel {
    overflow-x: auto;
  }
}
@media (max-width: 720px) {
  .knowledge-header {
    align-items: flex-start;
  }
  .knowledge-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .knowledge-split,
  .config-grid {
    grid-template-columns: 1fr;
  }
  .knowledge-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .knowledge-toolbar > :first-child {
    width: 100%;
  }
  .retrieval-controls {
    align-items: stretch;
    flex-direction: column;
  }
  .retrieval-controls > :first-child {
    width: 100%;
  }
  .log-row,
  .job-row {
    grid-template-columns: 1fr;
  }
}
.config-layout {
  display: grid;
  gap: 0.85rem;
}
.config-switcher {
  display: flex;
  width: fit-content;
  max-width: 100%;
  gap: 0.3rem;
  overflow-x: auto;
  border: 1px solid #e4e7ec;
  border-radius: 0.8rem;
  background: #f8fafc;
  padding: 0.3rem;
  scrollbar-width: thin;
}
.config-switcher button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 0.6rem;
  background: transparent;
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 550;
  padding: 0 0.75rem;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}
.config-switcher button:hover {
  background: #fff;
  color: #334155;
}
.config-switcher button.is-active {
  background: #fff;
  color: #6554c0;
  box-shadow: none;
}
.config-panel {
  overflow: hidden;
  padding-bottom: 0;
}
.config-panel > header {
  min-height: 4.5rem;
  background: #fff;
  padding: 1rem 1.15rem;
}
.config-panel > header h2 {
  font-size: 1rem;
}
.config-panel > header p {
  max-width: 42rem;
  font-size: 0.75rem;
}
.config-fields {
  display: grid;
  gap: 0.75rem;
  background: #f8fafc;
  padding: 1rem;
}
.file-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 7rem auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid #eef2f7;
}
.file-row:last-child {
  border-bottom: 0;
}
.file-row strong,
.file-row small {
  display: block;
}
.file-row small {
  margin-top: 0.18rem;
  color: #697386;
  font-size: 0.68rem;
}
.file-icon {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.65rem;
  background: #efedf8;
  color: #6554c0;
}
@media (max-width: 720px) {
  .file-row {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .file-row > .knowledge-badge,
  .file-row > .knowledge-actions {
    grid-column: 2;
  }
}
@media (max-width: 720px) {
  .config-switcher {
    width: 100%;
  }
  .config-panel > header {
    align-items: flex-start;
    gap: 0.75rem;
    flex-direction: column;
  }
}
</style>

<style scoped>
.knowledge-page,
.knowledge-view {
  gap: 24px;
}
.knowledge-tabs {
  padding: 0 22px;
  gap: 24px;
  border-radius: 8px;
}
.knowledge-tabs button {
  min-height: 52px;
  border-radius: 0;
  padding: 0;
  border-bottom: 2px solid transparent;
  color: #667085;
  font-size: 12px;
  font-weight: 450;
}
.knowledge-tabs button:hover {
  background: transparent;
}
.knowledge-tabs button.is-active {
  background: transparent;
  border-color: #6554c0;
  color: #6554c0;
  font-weight: 550;
}
.knowledge-tab-alert {
  min-width: 18px;
  padding: 2px 5px;
  border-radius: 4px;
  background: #f9eded;
  color: #a14545;
  font-size: 10px;
}
.knowledge-stats {
  gap: 0;
  padding: 22px 6px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #fff;
}
.knowledge-stats article {
  display: block;
  padding: 0 20px;
  border: 0;
  border-right: 1px solid #e4e7ec;
  border-radius: 0;
}
.knowledge-stats article:last-child {
  border: 0;
}
.knowledge-stats article > span {
  display: none;
}
.knowledge-stats strong {
  font-size: 25px;
  line-height: 1.2;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.knowledge-stats p {
  margin-top: 9px;
  font-size: 11px;
}
.knowledge-panel > header {
  padding: 20px 22px;
  background: #fff;
}
.knowledge-panel h2 {
  font-size: 14px;
  font-weight: 550;
}
.knowledge-panel header p {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.7;
}
.knowledge-split {
  gap: 24px;
}
.compact-list {
  padding: 0 22px 8px;
}
.compact-list > div {
  min-height: 65px;
  gap: 12px;
}
.compact-list strong {
  font-size: 12px;
  font-weight: 500;
}
.compact-list small {
  margin-top: 5px;
  font-size: 11px;
}
.knowledge-table {
  grid-template-columns: minmax(0, 1.7fr) 85px 90px 100px 180px;
  min-width: 0;
  padding: 18px 22px;
  gap: 14px;
}
.knowledge-table.head {
  padding-block: 12px;
  font-size: 11px;
  font-weight: 450;
}
.document-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.document-name strong {
  font-size: 13px;
  font-weight: 500;
}
.document-name small,
.document-metric small,
.muted {
  font-size: 11px;
  line-height: 1.7;
}
.document-metric strong {
  font-size: 13px;
  font-weight: 500;
}
.knowledge-badge {
  border-radius: 5px;
  font-size: 11px;
  font-weight: 450;
}
.knowledge-badge.is-success {
  background: #edf6f0;
  color: #327750;
}
.knowledge-badge.is-warning {
  background: #f7f2e9;
  color: #956b2c;
}
.knowledge-badge.is-error {
  background: #fbefef;
  color: #a14545;
}
.file-row {
  gap: 16px;
  padding: 18px 22px;
}
.file-row strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.file-row small {
  font-size: 11px;
  line-height: 1.8;
}
.file-icon {
  background: #f3f1f8;
  color: #8b7daf;
  border-radius: 7px;
}
.config-layout {
  gap: 24px;
}
.config-switcher {
  width: auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}
.config-switcher button {
  min-height: 40px;
  font-weight: 450;
  font-size: 12px;
}
.config-switcher button.is-active {
  background: #eeebf6;
  box-shadow: none;
}
.config-panel > header {
  padding: 24px;
}
.config-fields {
  gap: 0;
  padding: 0 24px;
  background: #fff;
}
.log-row,
.job-row {
  padding: 20px 22px;
  gap: 18px;
}
.log-row strong,
.job-row strong {
  font-size: 13px;
  font-weight: 500;
}
.job-row p,
.log-row p {
  font-size: 12px;
}
.job-row small,
.log-row small {
  font-size: 11px;
  line-height: 1.8;
}
.job-row button {
  margin-top: 10px;
}
.retrieval-form :deep(textarea) {
  min-height: 120px;
}
.knowledge-chunks {
  display: grid;
  gap: 16px;
}
.knowledge-chunks article {
  padding: 18px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #fafbfc;
}
.knowledge-chunks header {
  display: flex;
  justify-content: space-between;
  color: #8b7daf;
  font-size: 11px;
}
.knowledge-chunks small {
  color: #667085;
}
.knowledge-chunks strong {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 550;
}
.knowledge-chunks p {
  margin-top: 10px;
  color: #667085;
  font-size: 12px;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 1200px) {
  .knowledge-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px 0;
  }
  .knowledge-stats article:nth-child(3) {
    border: 0;
  }
  .knowledge-table {
    grid-template-columns: minmax(0, 1fr) 85px 85px 170px;
  }
  .knowledge-table > :nth-child(4) {
    display: none;
  }
}
@media (max-width: 950px) {
  .knowledge-table {
    grid-template-columns: minmax(0, 1fr) 85px;
  }
  .knowledge-table > :nth-child(3) {
    display: none;
  }
  .knowledge-table .knowledge-actions {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
  .knowledge-table.head > :last-child {
    display: none;
  }
  .file-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .file-row > .knowledge-actions {
    grid-column: 2/-1;
  }
  .knowledge-split {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 767px) {
  .knowledge-tabs {
    padding-inline: 16px;
    gap: 20px;
  }
  .knowledge-stats {
    padding: 20px 0;
  }
  .knowledge-stats article {
    padding-inline: 16px;
  }
  .knowledge-stats strong {
    font-size: 22px;
  }
  .knowledge-stats p {
    font-size: 10px;
  }
  .knowledge-table {
    padding: 16px;
  }
  .config-switcher {
    display: flex;
    overflow-x: auto;
  }
  .config-fields {
    padding-inline: 16px;
  }
  .file-row {
    padding: 16px;
  }
}
</style>

<style scoped>
.config-switcher.workspace-settings-nav {
  display: grid;
  align-content: start;
  width: 100%;
  gap: 5px;
}
.config-switcher.workspace-settings-nav button {
  width: 100%;
}
@media (max-width: 767px) {
  .config-switcher.workspace-settings-nav {
    display: flex;
    overflow-x: auto;
  }
  .config-switcher.workspace-settings-nav button {
    width: auto;
  }
}
</style>

<style scoped>
.knowledge-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.knowledge-stats article:nth-child(3) {
  border-right: 1px solid #e4e7ec;
}
.knowledge-overview-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: -12px;
  padding: 0 6px;
  color: #697386;
  font-size: 11px;
}
.knowledge-overview-meta button {
  color: #79649e;
  cursor: pointer;
}
@media (max-width: 640px) {
  .knowledge-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 0;
  }
  .knowledge-stats article:nth-child(2) {
    border: 0;
  }
  .knowledge-overview-meta {
    flex-wrap: wrap;
    font-size: 10px;
  }
}
</style>
