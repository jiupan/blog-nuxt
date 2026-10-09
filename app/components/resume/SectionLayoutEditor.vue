<template>
  <details class="section-layout-editor">
    <summary>模块内排版 <span>拖动排序 · 显隐 · 标签</span></summary>
    <div class="layout-panel">
      <div class="layout-panel-heading">
        <small>设置应用到本栏目全部条目；隐藏不会删除内容。</small>
        <button type="button" @click="emit('reset')">恢复默认</button>
      </div>
      <div v-for="group in groups" :key="group.scope" class="block-group">
        <strong v-if="section.type === 'experience' || section.type === 'project'" class="group-title">{{ group.scope === 'projectBlocks' ? '每个项目' : section.type === 'experience' ? '公司信息' : '共用技术栈' }}</strong>
        <div
          v-for="(block, index) in sectionBlocks(section, template, group.scope)"
          :key="block.key"
          class="block-row"
          :class="{ hidden: !block.visible, dragging: drag?.scope === group.scope && drag.key === block.key, 'drop-target': dropTarget?.scope === group.scope && dropTarget.key === block.key }"
          @dragover="dragOver($event, group.scope, block.key)"
          @drop="drop($event, group.scope, index)"
        >
          <button
            type="button"
            class="drag-handle"
            draggable="true"
            :aria-label="`拖动${blockName(block.key, group.scope)}排序，也可使用右侧上下移动按钮`"
            title="拖动调整顺序"
            @dragstart="startDrag($event, group.scope, block.key)"
            @dragend="endDrag"
          ><GripVerticalIcon /></button>
          <label class="visibility-control">
            <input type="checkbox" :checked="block.visible" :aria-label="`显示${blockName(block.key, group.scope)}`" @change="updateBlock(group.scope, index, { visible: ($event.target as HTMLInputElement).checked })">
            <span>{{ blockName(block.key, group.scope) }}</span>
          </label>
          <input
            v-if="block.key !== 'heading'"
            class="block-label-input"
            :value="block.label"
            maxlength="100"
            placeholder="无标签"
            :aria-label="`${blockName(block.key, group.scope)}的显示标签`"
            @input="updateBlock(group.scope, index, { label: ($event.target as HTMLInputElement).value })"
          >
          <span v-else class="heading-hint">名称、角色与时间作为一组</span>
          <select v-if="block.key === 'stack'" :value="block.style || 'text'" aria-label="技术栈展示方式" @change="updateBlock(group.scope, index, { style: ($event.target as HTMLSelectElement).value as 'tags' | 'text' })">
            <option value="tags">标签</option>
            <option value="text">文本</option>
          </select>
          <div class="block-order-actions">
            <button type="button" :disabled="index === 0" :aria-label="`上移${blockName(block.key, group.scope)}`" @click="move(group.scope, index, index - 1)"><ArrowUpIcon /></button>
            <button type="button" :disabled="index === sectionBlocks(section, template, group.scope).length - 1" :aria-label="`下移${blockName(block.key, group.scope)}`" @click="move(group.scope, index, index + 1)"><ArrowDownIcon /></button>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ArrowDown as ArrowDownIcon, ArrowUp as ArrowUpIcon, GripVertical as GripVerticalIcon } from '@lucide/vue'
import type { ResumeBlockConfig, ResumeBlockKey, ResumeSection, ResumeSectionPresentation, ResumeTemplate } from '~/types/resume'
import { createSectionPresentation, sectionBlocks, type ResumeBlockScope } from '~/utils/resume-section-layout'

const props = defineProps<{ section: ResumeSection, template: ResumeTemplate }>()
const emit = defineEmits<{ change: [presentation: ResumeSectionPresentation], reset: [] }>()
const drag = ref<{ scope: ResumeBlockScope, key: ResumeBlockKey } | null>(null)
const dropTarget = ref<{ scope: ResumeBlockScope, key: ResumeBlockKey } | null>(null)
const groups = computed(() => ['experience', 'project'].includes(props.section.type)
  ? [{ scope: 'blocks' as const }, { scope: 'projectBlocks' as const }]
  : [{ scope: 'blocks' as const }])

function blockName(key: ResumeBlockKey, scope: ResumeBlockScope) {
  if (key === 'heading') return props.section.type === 'experience' && scope === 'projectBlocks' ? '项目标题' : '标题行'
  if (key === 'secondary') return props.section.type === 'experience' ? '项目背景' : '补充说明'
  if (key === 'intro') return props.section.type === 'education' ? '成绩与课程' : props.section.type === 'research' ? '研究概述' : '内容描述'
  if (key === 'stack') return props.section.type === 'research' ? '方法与工具' : '技术栈'
  return props.section.type === 'skills' ? '技能列表' : '内容与成果'
}

function updateBlock(scope: ResumeBlockScope, index: number, patch: Partial<ResumeBlockConfig>) {
  const presentation = createSectionPresentation(props.section, props.template)
  const block = presentation[scope]?.[index]
  if (!block) return
  Object.assign(block, patch)
  emit('change', presentation)
}

function move(scope: ResumeBlockScope, from: number, to: number) {
  const presentation = createSectionPresentation(props.section, props.template)
  const blocks = presentation[scope]
  if (!blocks || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length || from === to) return
  const [block] = blocks.splice(from, 1)
  if (!block) return
  blocks.splice(to, 0, block)
  emit('change', presentation)
}

function startDrag(event: DragEvent, scope: ResumeBlockScope, key: ResumeBlockKey) {
  drag.value = { scope, key }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }
}

function dragOver(event: DragEvent, scope: ResumeBlockScope, key: ResumeBlockKey) {
  if (drag.value?.scope !== scope) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropTarget.value = { scope, key }
}

function drop(event: DragEvent, scope: ResumeBlockScope, index: number) {
  if (drag.value?.scope !== scope) return
  event.preventDefault()
  const from = sectionBlocks(props.section, props.template, scope).findIndex(block => block.key === drag.value?.key)
  move(scope, from, index)
  endDrag()
}

function endDrag() {
  drag.value = null
  dropTarget.value = null
}
</script>

<style scoped>
.section-layout-editor { margin: 0 16px 12px; border: 1px solid #dfe6ee; border-radius: 8px; background: #f8fafc; }
summary { padding: 10px 12px; color: #405673; cursor: pointer; font-size: 11px; font-weight: 700; }
summary span { margin-left: 8px; color: #8994a3; font-size: 10px; font-weight: 400; }
.layout-panel { padding: 0 10px 10px; }
.layout-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.layout-panel-heading small { color: #7f8997; font-size: 10px; }
button { display: inline-flex; align-items: center; justify-content: center; padding: 4px; border: 1px solid #dfe4eb; border-radius: 5px; background: #fff; color: #60738c; cursor: pointer; font-size: 10px; }
button:disabled { opacity: .35; cursor: default; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #74afe1; outline-offset: 2px; }
button svg { width: 13px; height: 13px; }
.group-title { display: block; margin: 8px 0 5px; color: #596577; font-size: 10px; }
.block-row { display: flex; align-items: center; gap: 7px; min-height: 38px; padding: 5px; border: 1px solid transparent; border-radius: 5px; }
.block-row.hidden { opacity: .55; }
.block-row.dragging { opacity: .35; }
.block-row.drop-target { border-color: #74afe1; background: #eaf4ff; }
.drag-handle { flex-shrink: 0; border-color: transparent; background: transparent; cursor: grab; }
.visibility-control { display: flex; flex: 0 0 85px; align-items: center; gap: 5px; color: #405673; font-size: 10px; }
.visibility-control input { accent-color: #0874d1; }
.block-label-input, select { height: 27px; min-width: 0; border: 1px solid #dfe4eb; border-radius: 5px; background: #fff; color: #405673; font-size: 10px; }
.block-label-input { flex: 1; width: 80px; padding: 0 6px; }
select { width: 56px; }
.heading-hint { flex: 1; color: #8994a3; font-size: 9px; }
.block-order-actions { display: flex; flex-shrink: 0; gap: 3px; margin-left: auto; }
@media (max-width: 420px) {
  summary span, .heading-hint { display: none; }
  .block-row { gap: 4px; }
  .visibility-control { flex-basis: 75px; }
  .section-layout-editor { margin-right: 10px; margin-left: 10px; }
}
</style>
