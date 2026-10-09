import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { createDefaultResume, normalizeResume } from '../app/utils/resume-defaults'
import { createPortableResume, parsePortableResume } from '../app/utils/resume-portable'
import { createSectionPresentation, sectionBlocks } from '../app/utils/resume-section-layout'
import { saveResumeSchema } from '../server/services/resumes/resume.schema'

describe('resume section presentation', () => {
  it('leaves older resumes without presentation settings', () => {
    const source = createDefaultResume()
    expect(normalizeResume(source).content.sections).toEqual(source.content.sections)
    expect(saveResumeSchema.parse(source).content.sections.every(section => !section.presentation)).toBe(true)
    expect(parsePortableResume(createPortableResume(source)).content.sections).toEqual(source.content.sections)
  })

  it('uses each original template order until a section is customized', () => {
    const section = createDefaultResume().content.sections.find(section => section.type === 'project')!
    expect(sectionBlocks(section, 'classic').map(block => block.key)).toEqual(['heading', 'secondary', 'intro', 'stack', 'bullets'])
    expect(sectionBlocks(section, 'modern').map(block => block.key)).toEqual(['heading', 'stack', 'secondary', 'intro', 'bullets'])
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
    const intro = presentation.blocks.find(block => block.key === 'intro')!
    intro.visible = false
    presentation.blocks = [presentation.blocks[0]!, intro, presentation.blocks[4]!, stack, presentation.blocks[2]!]
    section.presentation = presentation

    const saved = saveResumeSchema.parse(source)
    const imported = normalizeResume(parsePortableResume(JSON.parse(JSON.stringify(createPortableResume(source)))))
    for (const resume of [saved, imported]) {
      const project = resume.content.sections.find(section => section.type === 'project')!
      expect(project.presentation).toEqual(presentation)
      expect(sectionBlocks(project, 'classic')).toEqual(presentation.blocks)
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
