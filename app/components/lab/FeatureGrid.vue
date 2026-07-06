<template>
  <section class="feature-grid" aria-label="AI 实验功能">
    <article
      v-for="feature in features"
      :key="feature.id"
      class="feature-card"
      :class="[
        `tone-${feature.tone}`,
        {
          'is-wide': feature.wide,
          'is-tall': feature.tall,
          'has-visual': feature.hasVisual
        }
      ]"
      tabindex="0"
      role="button"
      :aria-label="`打开${feature.title}`"
      @click="$emit('openFeature', feature)"
      @keydown.enter.prevent="$emit('openFeature', feature)"
      @keydown.space.prevent="$emit('openFeature', feature)"
    >
      <span class="hud-corner top-left" aria-hidden="true"></span>
      <span class="hud-corner top-right" aria-hidden="true"></span>
      <span class="hud-corner bottom-left" aria-hidden="true"></span>
      <span class="hud-corner bottom-right" aria-hidden="true"></span>
      <span v-if="feature.wide || feature.tall" class="shimmer" aria-hidden="true"></span>

      <component :is="feature.icon" class="watermark-icon" aria-hidden="true" :stroke-width="1" />

      <div class="feature-content">
        <div>
          <div class="feature-top">
            <span class="feature-icon">
              <component :is="feature.icon" aria-hidden="true" :stroke-width="1.5" />
            </span>
            <span class="feature-arrow" aria-hidden="true">
              <ChevronRightIcon />
            </span>
          </div>

          <div class="feature-copy">
            <div class="feature-subtitle">
              <span>{{ feature.subtitle }}</span>
              <i></i>
            </div>
            <h2>{{ feature.title }}</h2>
          </div>
        </div>

        <div v-if="feature.hasVisual && feature.tall" class="feature-visual" aria-hidden="true">
          <div>
            <span></span>
            <i class="data-bar"></i>
          </div>
          <div>
            <span></span>
            <i class="data-bar"></i>
          </div>
          <div>
            <span></span>
            <i class="data-bar"></i>
          </div>
        </div>

        <footer class="feature-status">
          <span>
            <i></i>
            Active
          </span>
          <b>{{ feature.sysId }}</b>
        </footer>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { ChevronRight as ChevronRightIcon } from '@lucide/vue'
import type { LabFeature } from './lab.types'

defineProps<{
  features: LabFeature[]
}>()

defineEmits<{
  openFeature: [feature: LabFeature]
}>()
</script>
