<template>
  <div class="lab-page" :class="{ 'has-modal-open': selectedFeature }">
    <div class="lab-grid-bg" aria-hidden="true"></div>

    <main class="lab-shell">
      <LabHero :user="sessionData?.data.user" />
      <FeatureGrid :features="features" @open-feature="openFeature" />
    </main>

    <Teleport to="body">
      <Transition name="lab-modal">
        <div v-if="selectedFeature" class="modal-layer" @click.self="closeFeature">
          <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="`modal-${selectedFeature.id}`">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon" :class="`tone-${selectedFeature.tone}`">
                  <component :is="selectedFeature.icon" aria-hidden="true" />
                </span>
                <div>
                  <h2 :id="`modal-${selectedFeature.id}`">{{ selectedFeature.title }}</h2>
                  <p>{{ selectedFeature.subtitle }}</p>
                </div>
              </div>
              <button type="button" class="modal-close" aria-label="关闭" @click="closeFeature">
                <XIcon aria-hidden="true" />
              </button>
            </header>

            <div class="modal-body">
              <p>{{ selectedFeature.description }}</p>

              <AskBlogPanel
                v-if="selectedFeature.id === 'ask-blog'"
                v-model:question="askQuestion"
                :loading="askLoading"
                :error="askError"
                :result="askResult"
                :question-length="askQuestionLength"
                @ask="askBlogQuestion"
              />

              <ArticleSummaryPanel
                v-else-if="selectedFeature.id === 'article-summary'"
                v-model:select-open="summarySelectOpen"
                v-model:select-ref="summarySelectRef"
                :posts="summaryPosts"
                :selected-post="selectedSummaryPost"
                :selected-id="summaryPostId"
                :loading="summaryLoading"
                :error="summaryError"
                :result="summaryResult"
                @select-post="selectSummaryPost"
              />

              <SemanticSearchPanel
                v-else-if="selectedFeature.id === 'semantic-search'"
                v-model:query="semanticQuery"
                :loading="semanticLoading"
                :error="semanticError"
                :results="semanticResults"
              />

              <WritingAssistantPanel
                v-else-if="selectedFeature.id === 'writing-assistant'"
                v-model:select-open="summarySelectOpen"
                v-model:select-ref="summarySelectRef"
                :posts="summaryPosts"
                :selected-post="selectedSummaryPost"
                :selected-id="summaryPostId"
                :loading="writingLoading"
                :error="writingError"
                :result="writingResult"
                :is-admin="isAdmin"
                @select-post="selectSummaryPost"
              />

              <RelatedPostsPanel
                v-else-if="selectedFeature.id === 'article-recommend'"
                v-model:select-open="summarySelectOpen"
                v-model:select-ref="summarySelectRef"
                :posts="summaryPosts"
                :selected-post="selectedSummaryPost"
                :selected-id="summaryPostId"
                :loading="recommendLoading"
                :error="recommendError"
                :items="recommendResult"
                :is-admin="isAdmin"
                :relation-type-label="relationTypeLabel"
                @select-post="selectSummaryPost"
              />

              <SeoCheckerPanel
                v-else-if="selectedFeature.id === 'seo-checker'"
                v-model:select-open="summarySelectOpen"
                v-model:select-ref="summarySelectRef"
                :posts="summaryPosts"
                :selected-post="selectedSummaryPost"
                :selected-id="summaryPostId"
                :loading="seoCheckLoading"
                :error="seoCheckError"
                :result="seoCheckResult"
                :problems="seoCheckProblems"
                :is-admin="isAdmin"
                @select-post="selectSummaryPost"
              />

              <SiteInsightsPanel
                v-else-if="selectedFeature.id === 'site-insights'"
                :loading="siteInsightsLoading"
                :error="siteInsightsError"
                :result="siteInsightsResult"
                :trend-bar-height="trendBarHeight"
              />

              <LinkCheckerPanel
                v-else-if="selectedFeature.id === 'dead-link-checker'"
                v-model:select-open="summarySelectOpen"
                v-model:select-ref="summarySelectRef"
                :posts="summaryPosts"
                :selected-post="selectedSummaryPost"
                :selected-id="summaryPostId"
                :loading="linkCheckLoading"
                :error="linkCheckError"
                :result="linkCheckResult"
                :link-status-label="linkStatusLabel"
                @select-post="selectSummaryPost"
              />

              <DraftOrganizerPanel
                v-else-if="selectedFeature.id === 'draft-organizer'"
                :loading="draftOrganizerLoading"
                :error="draftOrganizerError"
                :result="draftOrganizerResult"
                :draft-priority-label="draftPriorityLabel"
              />

              <MonthlyReviewPanel
                v-else-if="selectedFeature.id === 'monthly-review'"
                v-model:month="monthlyReviewMonth"
                :loading="monthlyReviewLoading"
                :error="monthlyReviewError"
                :result="monthlyReviewResult"
                :copied="monthlyCopied"
                :copy-error="monthlyCopyError"
                :format-month-date="formatMonthDate"
                @copy-markdown="copyMonthlyMarkdown"
              />

              <div v-else class="lab-console">
                <div v-if="modalLoading" class="console-loading">
                  <Loader2Icon aria-hidden="true" />
                  <span>Initializing Neural Engine...</span>
                </div>

                <div v-else class="console-ready">
                  <div class="console-status">
                    <i></i>
                    <span>System Ready / 运行就绪</span>
                  </div>
                  <div class="console-lines">
                    <p>&gt; Connecting to blog database...</p>
                    <p>&gt; Analyzing context and metadata...</p>
                    <strong>
                      <SparklesIcon aria-hidden="true" />
                      Waiting for input to execute [{{ selectedFeature.title }}] protocol.
                    </strong>
                  </div>
                  <span class="scan-line" aria-hidden="true"></span>
                </div>
              </div>
            </div>

            <footer class="modal-actions">
              <button type="button" class="ghost-button" @click="closeFeature">取消关闭</button>
              <button
                type="button"
                class="primary-button"
                :disabled="isPrimaryActionDisabled"
                @click="handlePrimaryAction"
              >
                {{ primaryActionLabel }}
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  Sparkles as SparklesIcon,
  X as XIcon
} from '@lucide/vue'
import ArticleSummaryPanel from '~/components/lab/ArticleSummaryPanel.vue'
import AskBlogPanel from '~/components/lab/AskBlogPanel.vue'
import DraftOrganizerPanel from '~/components/lab/DraftOrganizerPanel.vue'
import FeatureGrid from '~/components/lab/FeatureGrid.vue'
import LabHero from '~/components/lab/LabHero.vue'
import LinkCheckerPanel from '~/components/lab/LinkCheckerPanel.vue'
import MonthlyReviewPanel from '~/components/lab/MonthlyReviewPanel.vue'
import RelatedPostsPanel from '~/components/lab/RelatedPostsPanel.vue'
import SemanticSearchPanel from '~/components/lab/SemanticSearchPanel.vue'
import SeoCheckerPanel from '~/components/lab/SeoCheckerPanel.vue'
import SiteInsightsPanel from '~/components/lab/SiteInsightsPanel.vue'
import WritingAssistantPanel from '~/components/lab/WritingAssistantPanel.vue'
const {
  features,
  selectedFeature,
  modalLoading,
  summaryPostId,
  summaryLoading,
  summaryError,
  summaryResult,
  recommendLoading,
  recommendError,
  recommendResult,
  writingLoading,
  writingError,
  writingResult,
  seoCheckLoading,
  seoCheckError,
  seoCheckResult,
  askQuestion,
  askLoading,
  askError,
  askResult,
  linkCheckLoading,
  linkCheckError,
  linkCheckResult,
  draftOrganizerLoading,
  draftOrganizerError,
  draftOrganizerResult,
  siteInsightsLoading,
  siteInsightsError,
  siteInsightsResult,
  monthlyReviewMonth,
  monthlyReviewLoading,
  monthlyReviewError,
  monthlyReviewResult,
  monthlyCopied,
  monthlyCopyError,
  semanticQuery,
  semanticLoading,
  semanticError,
  semanticResults,
  summarySelectOpen,
  summarySelectRef,
  sessionData,
  summaryPosts,
  isAdmin,
  selectedSummaryPost,
  seoCheckProblems,
  askQuestionLength,
  primaryActionLabel,
  isPrimaryActionDisabled,
  openFeature,
  closeFeature,
  selectSummaryPost,
  handlePrimaryAction,
  askBlogQuestion,
  relationTypeLabel,
  formatMonthDate,
  trendBarHeight,
  draftPriorityLabel,
  linkStatusLabel,
  copyMonthlyMarkdown
} = useLab()

useSeoMeta({
  title: 'AI 实验室',
  description: '博客 AI 实验功能集合'
})
</script>
