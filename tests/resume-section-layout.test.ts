import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { createDefaultResume, normalizeResume } from '../app/utils/resume-defaults'
import { createPortableResume, parsePortableResume } from '../app/utils/resume-portable'
import { createSectionPresentation, projectStack, sectionBlocks } from '../app/utils/resume-section-layout'
import { saveResumeSchema } from '../server/services/resumes/resume.schema'

describe('resume section presentation', () => {
  it('leaves older resumes without presentation settings', () => {
    const source = createDefaultResume()
    expect(normalizeResume(source).content.sections).toEqual(source.content.sections)
    expect(saveResumeSchema.parse(source).content.sections.every(section => !section.presentation)).toBe(true)
    expect(parsePortableResume(createPortableResume(source)).content.sections).toEqual(source.content.sections)
  })

  it('renders one shared stack and keeps project blocks separate in both templates', () => {
    const section = createDefaultResume().content.sections.find(section => section.type === 'project')!
    for (const template of ['classic', 'modern'] as const) {
      expect(sectionBlocks(section, template).map(block => block.key)).toEqual(['stack'])
      expect(sectionBlocks(section, template, 'projectBlocks').map(block => block.key)).toEqual(['heading', 'secondary', 'intro', 'bullets'])
    }
    expect(section.presentation).toBeUndefined()
  })

  it('persists reordered, hidden and renamed blocks through saving and JSON', () => {
    const source = reactive(createDefaultResume())
    const section = source.content.sections.find(section => section.type === 'project')!
    const originalItems = JSON.stringify(section.items)
    const presentation = createSectionPresentation(section, 'modern')
    const stack = presentation.blocks.find(block => block.key === 'stack')!
    stack.style = 'text'
    stack.label = '使用技术'
    const intro = presentation.projectBlocks!.find(block => block.key === 'intro')!
    intro.visible = false
    presentation.projectBlocks = [presentation.projectBlocks![0]!, intro, presentation.projectBlocks![3]!, presentation.projectBlocks![1]!]
    section.presentation = presentation

    const saved = saveResumeSchema.parse(source)
    const imported = normalizeResume(parsePortableResume(JSON.parse(JSON.stringify(createPortableResume(source)))))
    for (const resume of [saved, imported]) {
      const project = resume.content.sections.find(section => section.type === 'project')!
      expect(project.presentation).toEqual(presentation)
      expect(sectionBlocks(project, 'classic')).toEqual(presentation.blocks)
      expect(sectionBlocks(project, 'classic', 'projectBlocks')).toEqual(presentation.projectBlocks)
      expect(JSON.stringify(project.items)).toBe(originalItems)
    }
  })

  it('keeps company and project layout settings separate', () => {
    const source = createDefaultResume()
    const section = source.content.sections.find(section => section.type === 'experience')!
    const presentation = createSectionPresentation(section, 'modern')
    presentation.blocks.reverse()
    presentation.projectBlocks!.reverse()
    section.presentation = presentation
    const imported = parsePortableResume(createPortableResume(source))
    expect(imported.content.sections.find(section => section.type === 'experience')!.presentation).toEqual(presentation)
    expect(presentation.blocks.map(block => block.key)).toEqual(['stack', 'heading'])
    expect(presentation.projectBlocks!.map(block => block.key)).toEqual(['bullets', 'secondary', 'heading'])
  })

  it('restores template defaults without deleting hidden content', () => {
    const source = createDefaultResume()
    const section = source.content.sections.find(section => section.type === 'project')!
    const originalItems = JSON.stringify(section.items)
    section.presentation = createSectionPresentation(section, 'modern')
    section.presentation.blocks.forEach(block => { block.visible = false })
    delete section.presentation
    expect(sectionBlocks(section, 'modern').every(block => block.visible)).toBe(true)
    expect(JSON.stringify(section.items)).toBe(originalItems)
  })

  it('merges and deduplicates all legacy project stacks without losing technologies', () => {
    const source = createDefaultResume()
    const section = source.content.sections.find(section => section.type === 'project')!
    delete section.sharedStack
    section.items[0]!.stack = 'Spring Boot、MySQL、Redis、RocketMQ'
    section.items[1]!.stack = 'Spring Boot, LangChain4j, redis, Redisson'
    expect(projectStack(section)).toBe('Spring Boot、MySQL、Redis、RocketMQ、LangChain4j、Redisson')
    const normalized = normalizeResume(parsePortableResume(createPortableResume(source)))
    const project = normalized.content.sections.find(section => section.type === 'project')!
    expect(project.sharedStack).toBe(projectStack(section))
    expect(project.items.every(item => item.stack === '')).toBe(true)
    expect(normalizeResume(normalized)).toEqual(normalized)
    expect(saveResumeSchema.parse(normalized).content.sections.find(section => section.type === 'project')!.sharedStack).toBe(project.sharedStack)
    expect(parsePortableResume(createPortableResume(normalized)).content.sections).toEqual(normalized.content.sections)
  })

  it('retains edits to the shared stack after deleting or adding projects', () => {
    const source = normalizeResume(createDefaultResume())
    const section = source.content.sections.find(section => section.type === 'project')!
    section.sharedStack = 'Java、Redis'
    section.items.splice(0, 1)
    expect(projectStack(section)).toBe('Java、Redis')
    section.sharedStack = ''
    section.items[0]!.stack = 'old stack'
    expect(projectStack(section)).toBe('')
    expect(normalizeResume(source).content.sections.find(section => section.type === 'project')!.sharedStack).toBe('')
  })

  it('adapts earlier per-project layouts while preserving order, labels and visibility', () => {
    const section = createDefaultResume().content.sections.find(section => section.type === 'project')!
    section.presentation = {
      blocks: [
        { key: 'heading', visible: true, label: '' },
        { key: 'bullets', visible: true, label: '成果' },
        { key: 'stack', visible: false, label: '使用技术', style: 'text' },
        { key: 'intro', visible: true, label: '背景' }
      ]
    }
    const presentation = createSectionPresentation(section, 'modern')
    expect(presentation.blocks).toEqual([section.presentation.blocks[2]])
    expect(presentation.projectBlocks).toEqual([section.presentation.blocks[0], section.presentation.blocks[1], section.presentation.blocks[3]])
  })

  it('rejects repeated or unknown blocks and overly long labels', () => {
    const source = createDefaultResume()
    const section = source.content.sections[0]!
    const heading = { key: 'heading', visible: true, label: '' }
    for (const blocks of [[heading, heading], [{ ...heading, key: 'unknown' }], [{ ...heading, label: 'x'.repeat(101) }]]) {
      const invalid = { ...source, content: { ...source.content, sections: [{ ...section, presentation: { blocks } }] } }
      expect(saveResumeSchema.safeParse(invalid).success).toBe(false)
      expect(() => parsePortableResume({ ...createPortableResume(source), content: invalid.content })).toThrow()
    }
  })
})
