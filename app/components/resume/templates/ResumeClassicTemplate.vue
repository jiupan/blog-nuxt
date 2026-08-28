<template>
  <article class="resume-paper resume-template-classic" :style="layoutStyle">
    <header class="resume-header">
      <div class="identity">
        <h1>{{ data.basic.name || '你的名字' }}</h1>
        <p>{{ firstMetaLine }}</p>
        <p>{{ secondMetaLine }}</p>
      </div>
      <div class="portrait">
        <img v-if="data.basic.avatar" :src="data.basic.avatar" alt="">
        <UserRoundIcon v-else />
      </div>
    </header>

    <section v-for="section in data.sections" :key="section.id" class="resume-section">
      <h2>{{ section.title || '未命名栏目' }}</h2>

      <div v-for="item in section.items" :key="item.id" class="resume-entry">
        <div v-if="item.range || item.heading || item.tag" class="entry-heading">
          <strong>{{ item.range }}</strong>
          <strong>{{ item.heading }}</strong>
          <strong>{{ item.tag }}</strong>
        </div>
        <p v-if="item.secondary" class="secondary"><InlineRichText :text="item.secondary" /></p>
        <p v-if="item.intro">
          <b v-if="section.type === 'project'">项目描述：</b><InlineRichText :text="item.intro" />
        </p>
        <p v-if="item.stack"><b>{{ stackLabel(section.type) }}：</b><InlineRichText :text="item.stack" /></p>
        <ul v-if="bulletLines(item.bullets).length">
          <li v-for="(line, index) in bulletLines(item.bullets)" :key="index"><InlineRichText :text="line" /></li>
        </ul>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { UserRound as UserRoundIcon } from '@lucide/vue'
import type { ResumeContent, ResumeLayout, ResumeSectionType } from '~/types/resume'
import InlineRichText from '../InlineRichText.vue'

const props = defineProps<{ data: ResumeContent, layout: ResumeLayout }>()

const layoutStyle = computed(() => ({
  '--resume-section-gap': `${props.layout.sectionGap}mm`,
  '--resume-line-height': String(props.layout.lineHeight),
  '--resume-page-margin': `${props.layout.pageMargin}mm`,
  '--resume-vertical-margin': `${props.layout.verticalMargin}mm`,
  '--resume-font-size': `${props.layout.fontSize}pt`
}))

const firstMetaLine = computed(() => [
  props.data.basic.birth,
  props.data.basic.gender,
  props.data.basic.politicalStatus,
  props.data.basic.hometown
].filter(Boolean).join('  |  '))

const secondMetaLine = computed(() => [
  props.data.basic.phone,
  props.data.basic.email
].filter(Boolean).join('  |  '))

function bulletLines(value: string) {
  return value.split('\n').map(line => line.trim().replace(/^[•·]\s*/, '')).filter(Boolean)
}

function stackLabel(type: ResumeSectionType) {
  return type === 'research' ? '方法与工具' : '技术栈'
}
</script>
