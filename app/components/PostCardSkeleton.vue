<template>
  <template v-if="variant === 'archive'">
    <article v-for="item in count" :key="item" class="skeleton-card skeleton-archive" aria-hidden="true">
      <span class="skeleton-block skeleton-archive-cover" />
      <div class="skeleton-archive-copy">
        <span class="skeleton-line skeleton-kicker" />
        <span class="skeleton-line skeleton-title" />
        <span class="skeleton-line skeleton-summary is-wide" />
        <span class="skeleton-line skeleton-summary" />
        <div class="skeleton-footer">
          <span class="skeleton-line skeleton-tags" />
          <span class="skeleton-line skeleton-meta" />
        </div>
      </div>
      <span class="skeleton-block skeleton-arrow" />
    </article>
  </template>

  <template v-else>
    <article v-for="item in count" :key="item" class="skeleton-card skeleton-grid" aria-hidden="true">
      <span class="skeleton-block skeleton-grid-cover" />
      <div class="skeleton-grid-copy">
        <span class="skeleton-line skeleton-kicker" />
        <span class="skeleton-line skeleton-grid-title is-wide" />
        <span class="skeleton-line skeleton-grid-title" />
        <div class="skeleton-footer">
          <span class="skeleton-line skeleton-tags" />
          <span class="skeleton-line skeleton-date" />
        </div>
      </div>
    </article>
  </template>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'archive' | 'grid'
  count?: number
}>(), {
  variant: 'archive',
  count: 4
})
</script>

<style scoped>
.skeleton-card {
  position: relative;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--theme-border) 68%, transparent);
  background: var(--theme-surface);
  box-shadow: 0 4px 20px rgb(var(--theme-shadow) / 4%);
  content-visibility: auto;
}

.skeleton-block,
.skeleton-line {
  position: relative;
  display: block;
  overflow: hidden;
  background: color-mix(in srgb, var(--theme-border) 54%, var(--theme-surface));
}

.skeleton-block::after,
.skeleton-line::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 22%, color-mix(in srgb, white 58%, transparent) 48%, transparent 74%);
  content: "";
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.45s ease-in-out infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
}

.skeleton-archive {
  display: flex;
  width: 100%;
  min-height: 156px;
  gap: 22px;
  align-items: center;
  padding: 12px;
  border-radius: 24px;
  contain-intrinsic-size: auto 156px;
}

.skeleton-archive-cover {
  flex: 0 0 176px;
  width: 176px;
  height: 132px;
  border-radius: 16px;
}

.skeleton-archive-copy {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
}

.skeleton-kicker { width: 76px; height: 10px; }
.skeleton-title { width: min(72%, 520px); height: 20px; margin-top: 11px; }
.skeleton-summary { width: min(64%, 460px); margin-top: 8px; }
.skeleton-summary.is-wide { width: min(92%, 720px); margin-top: 14px; }
.skeleton-footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 15px; }
.skeleton-tags { width: 126px; height: 10px; }
.skeleton-meta { width: 150px; height: 10px; }
.skeleton-arrow { flex: 0 0 40px; width: 40px; height: 40px; margin-right: 4px; border-radius: 999px; }

.skeleton-grid {
  border-radius: 8px;
  contain-intrinsic-size: auto 350px;
}

.skeleton-grid-cover {
  width: 100%;
  min-height: 202px;
}

.skeleton-grid-copy {
  padding: 20px 30px 22px;
}

.skeleton-grid-title { width: 72%; height: 17px; margin-top: 11px; }
.skeleton-grid-title.is-wide { width: 94%; margin-top: 16px; }
.skeleton-grid .skeleton-footer { margin-top: 24px; }
.skeleton-grid .skeleton-date { width: 80px; height: 10px; }

@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}

@media (max-width: 760px) {
  .skeleton-grid { contain-intrinsic-size: auto 330px; }
  .skeleton-grid-cover { min-height: 170px; }
  .skeleton-grid-copy { padding: 18px; }
}

@media (max-width: 640px) {
  .skeleton-archive {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    min-height: 106px;
    gap: 14px;
    border-radius: 18px;
    padding: 9px;
    contain-intrinsic-size: auto 106px;
  }

  .skeleton-archive-cover { width: 104px; height: 88px; border-radius: 13px; }
  .skeleton-title { width: 82%; height: 15px; margin-top: 8px; }
  .skeleton-summary.is-wide { margin-top: 10px; }
  .skeleton-summary { margin-top: 6px; }
  .skeleton-footer { margin-top: 9px; }
  .skeleton-meta { width: 76px; }
  .skeleton-arrow { display: none; }
}

@media (max-width: 420px) {
  .skeleton-archive { grid-template-columns: 86px minmax(0, 1fr); gap: 11px; }
  .skeleton-archive-cover { width: 86px; height: 78px; }
  .skeleton-summary { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block::after,
  .skeleton-line::after { animation: none; }
}
</style>
