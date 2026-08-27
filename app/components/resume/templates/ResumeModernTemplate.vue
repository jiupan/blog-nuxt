<template>
  <article class="resume-paper resume-template-modern" :style="layoutStyle">
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

      <div v-for="(item, itemIndex) in section.items" :key="item.id" class="resume-entry" :class="{ 'education-entry': section.type === 'education', 'experience-entry': section.type === 'experience' }">
        <template v-if="section.type === 'education'">
          <div class="education-main">
            <div class="education-identity">
              <strong v-if="item.heading" class="education-school">{{ item.heading }}</strong>
              <span v-if="item.badge" class="education-badge">{{ item.badge }}</span>
              <strong v-if="item.tag" class="education-major">{{ item.tag }}</strong>
              <span v-if="item.direction" class="education-direction">{{ item.direction }}</span>
            </div>
            <strong v-if="item.range" class="education-range">{{ item.range }}</strong>
          </div>
          <p v-if="item.intro" class="education-summary"><InlineRichText :text="item.intro" /></p>
          <p v-if="item.secondary" class="secondary"><InlineRichText :text="item.secondary" /></p>
          <ul v-if="bulletLines(item.bullets).length">
            <li v-for="(line, index) in bulletLines(item.bullets)" :key="index"><InlineRichText :text="line" /></li>
          </ul>
        </template>

        <template v-else-if="section.type === 'experience'">
          <template v-if="itemIndex === 0">
            <div class="detail-heading">
              <div class="detail-identity">
                <strong v-if="item.heading">{{ item.heading }}</strong>
                <span v-if="item.tag" class="detail-role">{{ item.tag }}</span>
              </div>
              <strong v-if="item.range" class="detail-range">{{ item.range }}</strong>
            </div>

            <div v-if="stackItems(experienceStack(section.items)).length" class="detail-stack experience-stack">
              <b>技术栈：</b>
              <span v-for="technology in stackItems(experienceStack(section.items))" :key="technology">{{ technology }}</span>
            </div>
          </template>

          <div v-if="experienceTitle(item) || experienceBackground(item) || bulletLines(item.bullets).length" class="experience-project">
            <p v-if="experienceTitle(item)" class="experience-project-title"><InlineRichText :text="experienceTitle(item)" /></p>
            <p v-if="experienceBackground(item)" class="experience-background"><b>背景：</b><InlineRichText :text="experienceBackground(item)" /></p>
            <ul v-if="bulletLines(item.bullets).length">
              <li v-for="(line, index) in bulletLines(item.bullets)" :key="index"><InlineRichText :text="line" /></li>
            </ul>
          </div>
        </template>

        <template v-else-if="isDetailSection(section.type)">
          <div class="detail-heading">
            <div class="detail-identity">
              <strong v-if="item.heading">{{ item.heading }}</strong>
              <span v-if="item.tag" class="detail-role">{{ item.tag }}</span>
            </div>
            <strong v-if="item.range" class="detail-range">{{ item.range }}</strong>
          </div>

          <p v-if="item.secondary" class="secondary"><InlineRichText :text="item.secondary" /></p>
          <p v-if="item.intro" class="detail-description">
            <b>项目描述：</b><InlineRichText :text="item.intro" />
          </p>

          <div v-if="stackItems(item.stack).length" class="detail-stack">
            <b>技术栈：</b>
            <span v-for="technology in stackItems(item.stack)" :key="technology">{{ technology }}</span>
          </div>

          <ul v-if="bulletLines(item.bullets).length">
            <li v-for="(line, index) in bulletLines(item.bullets)" :key="index"><InlineRichText :text="line" /></li>
          </ul>
        </template>

        <template v-else>
          <div v-if="item.range || item.heading || item.tag" class="entry-heading">
            <strong>{{ item.range }}</strong>
            <strong>{{ item.heading }}</strong>
            <strong>{{ item.tag }}</strong>
          </div>
          <p v-if="item.secondary" class="secondary"><InlineRichText :text="item.secondary" /></p>
          <p v-if="item.intro">
            <InlineRichText :text="item.intro" />
          </p>
          <p v-if="item.stack"><b>{{ stackLabel(section.type) }}：</b><InlineRichText :text="item.stack" /></p>
          <ul v-if="bulletLines(item.bullets).length">
            <li v-for="(line, index) in bulletLines(item.bullets)" :key="index"><InlineRichText :text="line" /></li>
          </ul>
        </template>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { UserRound as UserRoundIcon } from '@lucide/vue'
import type { ResumeContent, ResumeLayout, ResumeSectionItem, ResumeSectionType } from '~/types/resume'
import { parseExperienceDetails } from '~/utils/resume-defaults'
import InlineRichText from '../InlineRichText.vue'

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

function stackItems(value: string) {
  return value.split(/[、,，|｜]+/).map(item => item.trim()).filter(Boolean)
}

function experienceStack(items: ResumeSectionItem[]) {
  return items.find(item => item.stack.trim())?.stack || ''
}

function experienceTitle(item: ResumeSectionItem) {
  return parseExperienceDetails(item.intro, item.secondary).title
}

function experienceBackground(item: ResumeSectionItem) {
  return parseExperienceDetails(item.intro, item.secondary).background
}

function isDetailSection(type: ResumeSectionType) {
  return type === 'project' || type === 'experience'
}

function stackLabel(type: ResumeSectionType) {
  return type === 'research' ? '方法与工具' : '技术栈'
}
</script>

<style scoped>
.education-entry {
  color: #30445f;
}

.resume-template-modern .resume-section h2 {
  color: #0874d1;
}

.resume-template-modern .resume-entry ul {
  margin-top: 1.4mm;
}

.resume-template-modern .resume-entry li {
  margin: .55mm 0;
  color: #30445f;
}

.resume-template-modern .resume-entry li::marker {
  color: #9aaabc;
}

.education-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 5mm;
  break-after: avoid;
}

.education-identity {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 2.6mm;
  white-space: nowrap;
}

.education-school {
  flex: 0 0 auto;
  color: #0e1e32;
  font-weight: 850;
}

.education-badge,
.detail-identity .detail-role {
  flex: 0 0 auto;
  padding: 0 .9mm;
  border: .25mm solid #aeb9c8;
  border-radius: .6mm;
  color: #60738c;
  line-height: 1.35;
}

.education-major {
  flex: 0 0 auto;
  color: #152842;
  font-weight: 800;
}

.education-direction {
  min-width: 0;
  overflow: hidden;
  color: #405673;
  text-overflow: ellipsis;
}

.education-range {
  flex: 0 0 auto;
  color: #60738c;
  font-weight: 600;
  white-space: nowrap;
}

.education-summary {
  margin-top: 1.2mm !important;
  color: #30445f;
}

.detail-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 5mm;
  break-after: avoid;
}

.detail-identity {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 3mm;
}

.detail-identity strong {
  color: #102037;
  font-weight: 850;
}

.detail-range {
  flex: 0 0 auto;
  color: #60738c;
  font-weight: 600;
  white-space: nowrap;
}

.detail-description {
  margin-top: 1.5mm !important;
  color: #30445f;
}

.detail-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.3mm 2mm;
  margin-top: 1.4mm;
  break-inside: avoid;
}

.detail-stack > b {
  margin-right: .5mm;
}

.detail-stack > span {
  padding: .25mm 2mm;
  border: .25mm solid #d8dee7;
  border-radius: 1mm;
  background: #f4f6f8;
  color: #344b68;
  line-height: 1.35;
}

.experience-entry + .experience-entry {
  margin-top: 3mm;
}

.experience-stack {
  margin-top: 1.3mm;
}

.experience-project {
  color: #30445f;
}

.experience-project-title {
  margin-top: 1.8mm !important;
  color: #102037;
  font-weight: 850;
}

.experience-background {
  margin-top: .8mm !important;
}

</style>
