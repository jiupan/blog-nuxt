import { describe, expect, it } from 'vitest'
import type { ResumeDocument } from '../app/types/resume'
import {
  createPortableResume,
  parsePortableResume,
  PORTABLE_RESUME_FORMAT,
  PORTABLE_RESUME_VERSION
} from '../app/utils/resume-portable'

function sampleResume(): ResumeDocument {
  return {
    title: '张三的后端简历',
    content: {
      basic: {
        name: '张三',
        birth: '2000-01',
        gender: '男',
        politicalStatus: '',
        hometown: '杭州',
        phone: '13800000000',
        email: 'zhangsan@example.com',
        avatar: 'data:image/png;base64,private-photo'
      },
      sections: [{
        id: 'project-1',
        title: '项目经验',
        type: 'project',
        items: [{
          id: 'project-item-1',
          range: '2025-01 ~ 2025-06',
          heading: '营销平台',
          badge: '',
          direction: '',
          secondary: '',
          tag: '后端开发',
          intro: '高并发营销系统',
          stack: 'Java、Redis',
          bullets: '将接口耗时降低 40%'
        }]
      }]
    },
    layout: {
      template: 'classic',
      sectionGap: 2.2,
      lineHeight: 1.5,
      pageMargin: 5,
      verticalMargin: 6,
      fontSize: 10.3
    }
  }
}

describe('portable resume JSON', () => {
  it('exports a versioned file without the avatar', () => {
    const portable = createPortableResume(sampleResume())

    expect(portable.format).toBe(PORTABLE_RESUME_FORMAT)
    expect(portable.version).toBe(PORTABLE_RESUME_VERSION)
    expect(portable.content.basic).not.toHaveProperty('avatar')
    expect(JSON.stringify(portable)).not.toContain('private-photo')
  })

  it('round-trips content and restores the supplied avatar', () => {
    const source = sampleResume()
    const imported = parsePortableResume(createPortableResume(source), 'existing-avatar')

    expect(imported.title).toBe(source.title)
    expect(imported.content.sections).toEqual(source.content.sections)
    expect(imported.content.basic.avatar).toBe('existing-avatar')
    expect(imported.layout.template).toBe('classic')
    expect(imported.layout.verticalMargin).toBe(6)
  })

  it('uses the legacy page margin as the vertical margin', () => {
    const portable = createPortableResume(sampleResume())
    const { verticalMargin: _verticalMargin, ...legacyLayout } = portable.layout

    expect(parsePortableResume({ ...portable, layout: legacyLayout }).layout.verticalMargin).toBe(5)
  })

  it('defaults older portable files to the classic template', () => {
    const portable = createPortableResume(sampleResume())
    delete portable.layout.template

    expect(parsePortableResume(portable).layout.template).toBe('classic')
  })

  it('fills missing IDs and replaces duplicate IDs from AI edits', () => {
    const portable = createPortableResume(sampleResume())
    const section = portable.content.sections[0]!
    delete section.id
    section.items.push({ ...section.items[0]!, id: section.items[0]!.id })

    const imported = parsePortableResume(portable)
    const ids = imported.content.sections[0]!.items.map(item => item.id)

    expect(imported.content.sections[0]!.id).toBeTruthy()
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects unknown formats and versions', () => {
    const portable = createPortableResume(sampleResume())

    expect(() => parsePortableResume({ ...portable, version: 2 })).toThrow()
    expect(() => parsePortableResume({ ...portable, format: 'another-resume' })).toThrow()
  })
})
