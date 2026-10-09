<template>
  <article class="resume-paper resume-template-modern" :style="layoutStyle">
    <header class="resume-header">
      <div class="identity">
        <h1>{{ data.basic.name || '你的名字' }}</h1>
        <p class="personal-meta-row">
          <span v-if="data.basic.birth">{{ data.basic.birth }}</span>
          <span v-if="data.basic.gender">{{ data.basic.gender }}</span>
          <span v-if="data.basic.politicalStatus">{{ data.basic.politicalStatus }}</span>
          <span v-if="data.basic.hometown">{{ data.basic.hometown }}</span>
        </p>
        <p class="personal-contact-row">
          <span v-if="data.basic.phone"><PhoneIcon />{{ data.basic.phone }}</span>
          <span v-if="data.basic.email"><MailIcon />{{ data.basic.email }}</span>
        </p>
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
          <template v-for="block in sectionBlocks(section, 'modern')" :key="block.key">
            <div v-if="block.key === 'heading' && block.visible" class="education-main">
              <div class="education-identity">
                <strong v-if="item.heading" class="education-school">{{ item.heading }}</strong>
                <span v-if="item.badge" class="education-badge">{{ item.badge }}</span>
                <strong v-if="item.tag" class="education-major">{{ item.tag }}</strong>
                <span v-if="item.direction" class="education-direction">{{ item.direction }}</span>
              </div>
              <strong v-if="item.range" class="education-range">{{ item.range }}</strong>
            </div>
            <ResumeTextBlock v-else-if="block.key !== 'heading'" :block="block" :value="item[block.key]" :paragraph-class="block.key === 'intro' ? 'education-summary' : block.key === 'secondary' ? 'secondary' : undefined" />
          </template>
        </template>

        <template v-else-if="section.type === 'experience'">
          <template v-if="itemIndex === 0">
            <template v-for="block in sectionBlocks(section, 'modern')" :key="block.key">
              <div v-if="block.key === 'heading' && block.visible" class="detail-heading">
                <div class="detail-identity">
                  <strong v-if="item.heading">{{ item.heading }}</strong>
                  <span v-if="item.tag" class="detail-role">{{ item.tag }}</span>
                </div>
                <strong v-if="item.range" class="detail-range">{{ item.range }}</strong>
              </div>

              <ResumeTextBlock v-else-if="block.key === 'stack'" :block="block" :value="experienceStack(section.items)" paragraph-class="experience-stack" />
            </template>
          </template>

          <div v-if="experienceTitle(item) || item.projectRole || experienceBackground(item) || bulletLines(item.bullets).length" class="experience-project">
            <template v-for="block in sectionBlocks(section, 'modern', 'projectBlocks')" :key="block.key">
              <div v-if="block.key === 'heading' && block.visible && (experienceTitle(item) || item.projectRole)" class="experience-project-heading">
                <p v-if="experienceTitle(item)" class="experience-project-title"><InlineRichText :text="experienceTitle(item)" /></p>
                <span v-if="item.projectRole" class="experience-project-role">{{ item.projectRole }}</span>
              </div>
              <ResumeTextBlock v-else-if="block.key === 'secondary' || block.key === 'bullets'" :block="block" :value="block.key === 'secondary' ? experienceBackground(item) : item.bullets" :paragraph-class="block.key === 'secondary' ? 'experience-background' : undefined" />
            </template>
          </div>
        </template>

        <template v-else-if="section.type === 'project'">
          <template v-for="block in sectionBlocks(section, 'modern')" :key="block.key">
            <div v-if="block.key === 'heading' && block.visible" class="detail-heading">
              <div class="detail-identity">
                <strong v-if="item.heading">{{ item.heading }}</strong>
                <span v-if="item.tag" class="detail-role">{{ item.tag }}</span>
                <strong v-if="item.badge" class="experience-honor">{{ item.badge }}</strong>
              </div>
              <strong v-if="item.range" class="detail-range">{{ item.range }}</strong>
            </div>

            <ResumeTextBlock v-else-if="block.key !== 'heading'" :block="block" :value="item[block.key]" :paragraph-class="block.key === 'intro' ? 'detail-description' : block.key === 'secondary' ? 'secondary' : undefined" />
          </template>
        </template>

        <template v-else>
          <template v-for="block in sectionBlocks(section, 'modern')" :key="block.key">
            <div v-if="block.key === 'heading' && block.visible && (item.range || item.heading || item.tag)" class="entry-heading">
              <strong>{{ item.range }}</strong>
              <strong>{{ item.heading }}</strong>
              <strong>{{ item.tag }}</strong>
            </div>
            <ResumeTextBlock v-else-if="block.key !== 'heading'" :block="block" :value="item[block.key]" :paragraph-class="block.key === 'secondary' ? 'secondary' : undefined" />
          </template>
        </template>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { Mail as MailIcon, Phone as PhoneIcon, UserRound as UserRoundIcon } from '@lucide/vue'
import type { ResumeContent, ResumeLayout, ResumeSectionItem } from '~/types/resume'
import { parseExperienceDetails } from '~/utils/resume-defaults'
import { bulletLines, sectionBlocks } from '~/utils/resume-section-layout'
import InlineRichText from '../InlineRichText.vue'
import ResumeTextBlock from '../ResumeTextBlock.vue'

const props = defineProps<{ data: ResumeContent, layout: ResumeLayout }>()

const layoutStyle = computed(() => ({
  '--resume-section-gap': `${props.layout.sectionGap}mm`,
  '--resume-line-height': String(props.layout.lineHeight),
  '--resume-page-margin': `${props.layout.pageMargin}mm`,
  '--resume-vertical-margin': `${props.layout.verticalMargin}mm`,
  '--resume-font-size': `${props.layout.fontSize}pt`
}))

function experienceStack(items: ResumeSectionItem[]) {
  return items.find(item => item.stack.trim())?.stack || ''
}

function experienceTitle(item: ResumeSectionItem) {
  return parseExperienceDetails(item.intro, item.secondary).title
}

function experienceBackground(item: ResumeSectionItem) {
  return parseExperienceDetails(item.intro, item.secondary).background
}
</script>

<style scoped>
.education-entry {
  color: #30445f;
}

.resume-template-modern .resume-section h2 {
  color: #0874d1;
  font-weight: 750;
}

.resume-template-modern .identity h1 {
  margin-bottom: 3.2mm;
  font-size: 20pt;
  font-weight: 750;
  letter-spacing: .02em;
}

.resume-template-modern .resume-header {
  min-height: 30mm;
  align-items: center;
  justify-content: flex-start;
  padding: 2mm 39mm 2mm 4mm;
}

.resume-template-modern .identity {
  text-align: left;
}

.resume-template-modern .identity p {
  display: flex;
  align-items: center;
  margin-bottom: 1.8mm;
  color: #405673;
  font-size: 10.5pt;
  white-space: nowrap;
}

.resume-template-modern .identity p > span {
  display: inline-flex;
  align-items: center;
}

.resume-template-modern .identity p > span + span::before {
  width: .25mm;
  height: 4.2mm;
  margin: 0 3mm;
  background: #ccd4df;
  content: "";
}

.resume-template-modern .personal-contact-row svg {
  width: 3.7mm;
  height: 3.7mm;
  margin-right: 1.5mm;
  color: #9aa7b8;
  stroke-width: 1.8;
}

.resume-template-modern .portrait {
  top: 0;
  width: 27mm;
  height: 31mm;
  background: #e7ecf4;
  color: #8e9db1;
}

.resume-template-modern .resume-entry :deep(b) {
  font-weight: 700;
}

.resume-template-modern :deep(.inline-rich-text strong) {
  font-weight: 700;
}

.resume-template-modern .resume-entry :deep(ul) {
  margin-top: 1.4mm;
}

.resume-template-modern .resume-entry :deep(li) {
  margin: .55mm 0;
  color: #30445f;
}

.resume-template-modern .resume-entry :deep(li)::marker {
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
  font-weight: 750;
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

.experience-honor { flex: 0 0 auto; white-space: nowrap; }

.education-major {
  flex: 0 0 auto;
  color: #152842;
  font-weight: 700;
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

:deep(.education-summary) {
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
  font-weight: 750;
}

.detail-range {
  flex: 0 0 auto;
  color: #60738c;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.detail-description) {
  margin-top: 1.5mm !important;
  color: #30445f;
}

.experience-entry + .experience-entry {
  margin-top: 3mm;
}

:deep(.experience-stack) {
  margin-top: 1.3mm;
}

.experience-project {
  color: #30445f;
}

.experience-project-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 5mm;
  margin-top: 1.8mm;
  break-after: avoid;
}

.experience-project-title {
  min-width: 0;
  margin: 0 !important;
  color: #102037;
  font-weight: 750;
}

.experience-project-role {
  flex: 0 0 auto;
  color: #102037;
  font-weight: 750;
  white-space: nowrap;
}

:deep(.experience-background) {
  margin-top: .8mm !important;
}

</style>
