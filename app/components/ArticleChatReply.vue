<template>
  <div ref="replyEl" class="chat-reply-content">
    <template v-for="(block, index) in blocks" :key="index">
      <!-- The renderer escapes source HTML and constructs citation controls from validated IDs. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="chat-reply-block" @click="handleBlockClick($event, index)" v-html="block" />
      <aside v-if="selection?.block === index && selectedSource" :id="sourcePanelId" class="chat-source" aria-label="引用原文">
        <header>
          <span>来源 {{ selectedSource.number }}</span>
          <strong>{{ selectedSource.citation.headingPath || '文章正文' }}</strong>
        </header>
        <blockquote v-if="sourceExcerpt">{{ sourceExcerpt }}</blockquote>
        <button type="button" @click="emit('goToCitation', selectedSource.citation)">
          查看原文章节 <Icon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </button>
      </aside>
    </template>

    <details v-if="legacySections.length" class="chat-legacy-sources">
      <summary>检索到的章节 <span>{{ legacySections.length }}</span></summary>
      <button v-for="citation in legacySections" :key="citation.headingPath || '正文'" type="button" @click="emit('goToCitation', citation)">
        {{ citation.headingPath || '文章正文' }} <Icon name="i-lucide-arrow-up-right" aria-hidden="true" />
      </button>
    </details>
  </div>
</template>

<script setup lang="ts">
import 'katex/dist/katex.min.css'
import { renderArticleChatBlocks, type ArticleChatCitation } from '~/utils/article-chat-markdown'

const props = defineProps<{ content: string, citations?: ArticleChatCitation[], streaming?: boolean }>()
const selection = defineModel<{ block: number, referenceId: number } | null>()
const emit = defineEmits<{ goToCitation: [citation: ArticleChatCitation] }>()
const replyEl = ref<HTMLElement | null>(null)
const sourcePanelId = useId()
const references = computed(() => {
  const sources = new Map<number, { citation: ArticleChatCitation, number: number }>()
  for (const citation of props.citations || []) {
    const id = citation.referenceId
    if (id && !sources.has(id)) sources.set(id, { citation, number: sources.size + 1 })
  }
  return sources
})
const blocks = computed(() => renderArticleChatBlocks(
  props.content,
  new Map([...references.value].map(([id, source]) => [id, source.number])),
  Boolean(props.streaming)
))
const selectedSource = computed(() => references.value.get(selection.value?.referenceId ?? 0))
const sourceExcerpt = computed(() => {
  const excerpt = selectedSource.value?.citation.excerpt || ''
  return excerpt.length > 160 ? `${excerpt.slice(0, 160).trimEnd()}…` : excerpt
})
const legacySections = computed(() => {
  const sections = new Map<string, ArticleChatCitation>()
  for (const citation of props.citations || []) {
    const heading = citation.headingPath || ''
    if (!citation.referenceId && !sections.has(heading)) sections.set(heading, citation)
  }
  return [...sections.values()]
})

watchPostEffect(() => {
  // The markers come from the Markdown renderer. Keep their state in sync without replacing the focused button.
  const current = selection.value
  const renderedBlocks = blocks.value
  const elements = replyEl.value?.querySelectorAll('.chat-reply-block')
  renderedBlocks.forEach((_, index) => {
    elements?.[index]?.querySelectorAll<HTMLButtonElement>('[data-reference-id]').forEach(button => {
      const expanded = current?.block === index && current.referenceId === Number(button.dataset.referenceId)
      button.setAttribute('aria-expanded', String(expanded))
      if (expanded) button.setAttribute('aria-controls', sourcePanelId)
      else button.removeAttribute('aria-controls')
    })
  })
})

async function handleBlockClick(event: MouseEvent, block: number) {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null
  if (!button) return
  if (button.dataset.referenceId) {
    const referenceId = Number(button.dataset.referenceId)
    if (references.value.has(referenceId)) {
      selection.value = selection.value?.block === block && selection.value.referenceId === referenceId
        ? null
        : { block, referenceId }
    }
  } else if (button.hasAttribute('data-copy-code')) {
    const code = button.closest('.chat-code')?.querySelector('code')?.textContent
    if (code == null) return
    try {
      await navigator.clipboard.writeText(code)
      button.textContent = '已复制'
    } catch {
      button.textContent = '复制失败'
    }
  }
}
</script>

<style scoped>
.chat-reply-content {
  --reply-accent: color-mix(in srgb, #b65348 74%, var(--theme-text-strong));
  --reply-tint: color-mix(in srgb, #b65348 9%, var(--theme-surface));
  display: grid;
  min-width: 0;
  gap: 9px;
  color: var(--theme-text-soft);
  font-size: 15px;
  line-height: 1.68;
  overflow-wrap: anywhere;
}

.chat-reply-block { min-width: 0; }
.chat-reply-block :deep(:is(p, ul, ol, pre, blockquote)) { margin: 0; padding-top: 0; }
.chat-reply-block :deep(:is(h1, h2, h3, h4, h5, h6)) { margin: 3px 0 0; color: var(--theme-text-strong); font-size: 1.04em; font-weight: 700; }
.chat-reply-block :deep(:is(strong, b)) { color: var(--theme-text-strong); font-weight: 650; }
.chat-reply-block :deep(:is(ul, ol)) { padding-inline-start: 1.25em; }
.chat-reply-block :deep(ul) { list-style: disc; }
.chat-reply-block :deep(ol) { list-style: decimal; }
.chat-reply-block :deep(li + li) { margin-top: 4px; }
.chat-reply-block :deep(a) { color: var(--theme-info); text-decoration: underline; text-underline-offset: 2px; }
.chat-reply-block :deep(blockquote) { border-inline-start: 2px solid var(--theme-border); padding-inline-start: 10px; }
.chat-reply-block :deep(:not(pre) > code) { border-radius: 4px; background: var(--theme-surface-hover); padding: 1px 4px; font-size: .88em; }
.chat-reply-block :deep(.chat-table),
.chat-reply-block :deep(pre),
.chat-reply-block :deep(.chat-inline-math),
.chat-reply-block :deep(.katex-display) { max-width: 100%; overflow-x: auto; }
.chat-reply-block :deep(.chat-inline-math) { display: inline-block; vertical-align: middle; }
.chat-reply-block :deep(.chat-table table) { width: max-content; min-width: 100%; border-collapse: collapse; font-size: .91em; }
.chat-reply-block :deep(:is(th, td)) { border: 1px solid var(--theme-border); padding: 5px 8px; }
.chat-reply-block :deep(th) { background: var(--theme-surface-muted); }
.chat-reply-block :deep(.katex-display) { margin: 3px 0; padding: 5px 0; }
.chat-reply-block :deep(.katex) { font-size: 1.04em; }
.chat-reply-block :deep(.chat-code) { min-width: 0; overflow: hidden; border: 1px solid var(--theme-border); border-radius: 9px; background: var(--theme-surface-muted); }
.chat-reply-block :deep(.chat-code-heading) { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 9px; border-bottom: 1px solid var(--theme-border); color: var(--theme-text-muted); font-size: 12px; }
.chat-reply-block :deep(pre) { padding: 8px 10px; white-space: pre; font-size: .87em; }
.chat-reply-block :deep(.chat-unfinished) { white-space: pre-wrap; }

.chat-reply-block :deep(.chat-reference) {
  display: inline-grid;
  width: 25px;
  height: 25px;
  margin-inline: 4px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--reply-tint);
  color: var(--reply-accent);
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
}
.chat-reply-block :deep(.chat-reference[aria-expanded='true']) { border-color: currentColor; }
.chat-source { display: grid; gap: 4px; border-inline-start: 2px solid var(--reply-accent); border-radius: 0 8px 8px 0; background: var(--theme-surface-raised); padding: 8px 10px; font-size: 13px; }
.chat-source header { display: flex; flex-wrap: wrap; gap: 3px 8px; }
.chat-source header span, .chat-source button { color: var(--reply-accent); }
.chat-source header strong { color: var(--theme-text-strong); }
.chat-source blockquote { margin: 0; color: var(--theme-text-muted); }
.chat-source button, .chat-legacy-sources button { display: flex; align-items: center; gap: 4px; justify-self: start; padding-block: 4px; text-align: start; }
.chat-legacy-sources { color: var(--theme-text-muted); font-size: 13px; }
.chat-legacy-sources summary { width: fit-content; cursor: pointer; }
.chat-legacy-sources summary span { color: var(--reply-accent); }
.chat-legacy-sources button { color: var(--theme-text-soft); }
.chat-source button :deep(.iconify), .chat-legacy-sources button :deep(.iconify) { width: 13px; height: 13px; flex: none; }
.chat-reply-content button, .chat-reply-block :deep(button) { cursor: pointer; }
.chat-reply-content button:focus-visible, .chat-reply-block :deep(button:focus-visible) { outline: 2px solid var(--reply-accent); outline-offset: 2px; }
</style>
