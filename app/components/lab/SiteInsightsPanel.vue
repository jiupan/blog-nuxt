<template>
  <div class="summary-tool">
    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="result" class="site-insights-result">
      <section class="site-metric-grid">
        <article>
          <span>已发布</span>
          <strong>{{ result.summary.publishedPosts }}</strong>
        </article>
        <article>
          <span>草稿</span>
          <strong>{{ result.summary.draftPosts }}</strong>
        </article>
        <article>
          <span>总浏览</span>
          <strong>{{ result.summary.totalViews }}</strong>
        </article>
        <article>
          <span>近 30 天</span>
          <strong>{{ result.summary.recent30Published }}</strong>
        </article>
      </section>

      <section class="site-panel">
        <h3>发布趋势</h3>
        <div class="trend-bars">
          <div v-for="item in result.publishingTrend" :key="item.label">
            <span>{{ item.label }}</span>
            <i :style="{ height: `${trendBarHeight(item.count)}%` }"></i>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>

      <section v-if="result.categories.length" class="site-panel">
        <h3>分类分布</h3>
        <div class="category-bars">
          <div v-for="item in result.categories.slice(0, 6)" :key="item.id">
            <span>{{ item.name }}</span>
            <b><i :style="{ width: `${item.percentage}%` }"></i></b>
            <strong>{{ item.count }}</strong>
          </div>
        </div>
      </section>

      <section v-if="result.tags.length" class="site-panel">
        <h3>高频标签</h3>
        <div class="insight-tags">
          <span v-for="item in result.tags" :key="item.id">{{ item.name }} · {{ item.count }}</span>
        </div>
      </section>

      <section class="site-panel site-post-columns">
        <div>
          <h3>热门文章</h3>
          <NuxtLink v-for="item in result.popularPosts" :key="item.id" :to="postPath(item.slug)">
            <span>{{ item.viewCount }} views</span>
            <strong>{{ item.title }}</strong>
          </NuxtLink>
          <p v-if="!result.popularPosts.length" class="inline-empty">暂无已发布文章。</p>
        </div>
        <div>
          <h3>低浏览文章</h3>
          <NuxtLink v-for="item in result.lowViewPosts" :key="item.id" :to="postPath(item.slug)">
            <span>{{ item.viewCount }} views</span>
            <strong>{{ item.title }}</strong>
          </NuxtLink>
          <p v-if="!result.lowViewPosts.length" class="inline-empty">暂无可分析文章。</p>
        </div>
      </section>

      <section class="site-panel">
        <h3>内容洞察</h3>
        <ul>
          <li v-for="item in result.insights" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="site-panel">
        <h3>选题建议</h3>
        <ul>
          <li v-for="item in result.topicSuggestions" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <ActivityIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在分析站点内容...' : '分析文章结构、发布节奏、分类标签和后续选题。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity as ActivityIcon,
  Loader2 as Loader2Icon
} from '@lucide/vue'
import { postPath } from '~/utils/post-path'
import type { SiteInsightsResult } from './lab.types'

defineProps<{
  loading: boolean
  error: string
  result: SiteInsightsResult | null
  trendBarHeight: (count: number) => number
}>()
</script>
