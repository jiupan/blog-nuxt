<template>
  <article class="resume-paper" :style="layoutStyle">
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
import '@fontsource-variable/noto-sans-sc'
import { UserRound as UserRoundIcon } from '@lucide/vue'
import type { ResumeContent, ResumeLayout, ResumeSectionType } from '~/types/resume'
import InlineRichText from './InlineRichText.vue'

const props = defineProps<{ data: ResumeContent, layout: ResumeLayout }>()

const layoutStyle = computed(() => ({
  '--resume-section-gap': `${props.layout.sectionGap}mm`,
  '--resume-line-height': String(props.layout.lineHeight),
  '--resume-page-margin': `${props.layout.pageMargin}mm`,
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

<style scoped>
.resume-paper {
  width: 210mm;
  min-height: 297mm;
  padding: 5mm var(--resume-page-margin);
  overflow: hidden;
  background: #fff;
  box-shadow: 0 20px 60px rgb(15 23 42 / 14%);
  color: #29313a;
  color-scheme: light;
  font-family: "Noto Sans SC Variable", sans-serif;
  font-size: var(--resume-font-size);
  line-height: var(--resume-line-height);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.resume-header {
  position: relative;
  display: flex;
  min-height: 31mm;
  align-items: flex-start;
  justify-content: center;
  padding: 0 38mm 4mm 0;
  break-inside: avoid;
}
.identity { width: 100%; text-align: center; }
.identity h1 { margin: 0 0 3mm; color: #121820; font-size: 20pt; font-weight: 800; letter-spacing: .04em; }
.identity p { margin: 0 0 1.2mm; white-space: pre-wrap; }
.portrait {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  width: 27mm;
  height: 31mm;
  place-items: center;
  overflow: hidden;
  background: #eef1f5;
  color: #a5acb6;
}
.portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait svg { width: 12mm; height: 12mm; }
.resume-section + .resume-section { margin-top: var(--resume-section-gap); }
.resume-section h2 {
  margin: 0 0 1.6mm;
  padding-bottom: .6mm;
  border-bottom: .40mm solid #0874d1;
  color: #0874d1;
  font-size: 12pt;
  font-weight: 800;
  line-height: 1.2;
  break-after: avoid;
}
.resume-entry {
  orphans: 2;
  widows: 2;
}
.resume-entry + .resume-entry { margin-top: 1.8mm; }
.entry-heading {
  display: grid;
  grid-template-columns: minmax(36mm, 1fr) minmax(56mm, 1.4fr) minmax(38mm, 1.2fr);
  align-items: baseline;
  gap: 3mm;
  color: #181d23;
  break-after: avoid;
}
.entry-heading strong:nth-child(2) { text-align: center; }
.entry-heading strong:last-child { text-align: right; }
.resume-entry p { margin: .45mm 0; white-space: pre-line; }
.resume-entry b { color: #1b222a; font-weight: 800; }
.secondary { color: #4f5964; }
.resume-entry ul {
  display: block;
  margin: .3mm 0 0;
  padding-left: 5mm;
  list-style: disc outside !important;
}
.resume-entry li { margin: .25mm 0; padding-left: .5mm; break-inside: avoid; }
.resume-entry li::marker { color: #3f4853; font-size: .72em; }

@media print {
  .resume-paper {
    min-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    overflow: visible;
    box-shadow: none;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
}
</style>
