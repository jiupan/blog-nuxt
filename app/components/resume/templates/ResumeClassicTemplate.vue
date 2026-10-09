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

      <div v-for="(item, itemIndex) in section.items" :key="item.id" class="resume-entry">
        <template v-if="section.type === 'experience' && section.presentation">
          <template v-if="itemIndex === 0">
            <template v-for="block in sectionBlocks(section, 'classic')" :key="block.key">
              <div v-if="block.key === 'heading' && block.visible && (item.range || item.heading || item.tag || item.badge)" class="entry-heading">
                <strong>{{ item.range }}</strong>
                <strong>{{ item.heading }}</strong>
                <strong class="entry-heading-tail">
                  <span>{{ item.tag }}</span>
                  <span v-if="item.badge" class="experience-honor">{{ item.badge }}</span>
                </strong>
              </div>
              <ResumeTextBlock v-else-if="block.key === 'stack'" :block="block" :value="section.items.find(entry => entry.stack.trim())?.stack || ''" />
            </template>
          </template>
          <template v-for="block in sectionBlocks(section, 'classic', 'projectBlocks')" :key="block.key">
            <div v-if="block.key === 'heading' && block.visible && (experienceDetails(item).title || item.projectRole)" class="classic-project-heading">
              <strong><InlineRichText :text="experienceDetails(item).title" /></strong>
              <strong v-if="item.projectRole">{{ item.projectRole }}</strong>
            </div>
            <ResumeTextBlock v-else-if="block.key === 'secondary' || block.key === 'bullets'" :block="block" :value="block.key === 'secondary' ? experienceDetails(item).background : item.bullets" :paragraph-class="block.key === 'secondary' ? 'secondary' : undefined" />
          </template>
        </template>
        <template v-else>
          <template v-for="block in flatBlocks(section)" :key="block.key">
            <div v-if="block.key === 'heading' && block.visible && (item.range || item.heading || item.tag || (section.type === 'experience' && item.badge))" class="entry-heading">
              <strong>{{ item.range }}</strong>
              <strong>{{ item.heading }}</strong>
              <strong class="entry-heading-tail">
                <span>{{ item.tag }}</span>
                <span v-if="section.type === 'experience' && item.badge" class="experience-honor">{{ item.badge }}</span>
              </strong>
            </div>
            <ResumeTextBlock v-else-if="block.key !== 'heading'" :block="block" :value="item[block.key]" :paragraph-class="block.key === 'secondary' ? 'secondary' : undefined" />
          </template>
        </template>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { UserRound as UserRoundIcon } from '@lucide/vue'
import type { ResumeContent, ResumeLayout, ResumeSection, ResumeSectionItem } from '~/types/resume'
import { parseExperienceDetails } from '~/utils/resume-defaults'
import { sectionBlocks } from '~/utils/resume-section-layout'
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

function flatBlocks(section: ResumeSection) {
  // Older classic internships rendered each item as a flat entry.
  return sectionBlocks(section.type === 'experience' ? { ...section, type: 'campus' } : section, 'classic')
}

function experienceDetails(item: ResumeSectionItem) {
  return parseExperienceDetails(item.intro, item.secondary)
}
</script>

<style scoped>
.entry-heading-tail {
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 2mm;
}

.experience-honor { flex: 0 0 auto; white-space: nowrap; }
.classic-project-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 5mm; margin-top: 1.8mm; break-after: avoid; }
.classic-project-heading > strong:last-child:not(:first-child) { flex: 0 0 auto; }
</style>
