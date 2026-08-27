import { describe, expect, it } from 'vitest'
import {
  createDefaultResume,
  createEmptySectionItem,
  normalizeResume,
  parseExperienceDetails
} from '../app/utils/resume-defaults'

describe('resume experience structure', () => {
  it('splits legacy work-description text into project fields', () => {
    expect(parseExperienceDetails(
      '**工作描述：项目一：骑手事故处置 AI Agent**\n**背景：**处理多策略并发触发问题。'
    )).toEqual({
      title: '项目一：骑手事故处置 AI Agent',
      background: '处理多策略并发触发问题。'
    })
  })

  it('keeps one shared stack on the first internship project', () => {
    const resume = createDefaultResume()
    const section = resume.content.sections.find(item => item.type === 'experience')!
    section.items = [
      {
        ...createEmptySectionItem(),
        heading: '美团',
        intro: '**工作描述：项目一：事故处置**\n**背景：**事故消息处理。'
      },
      {
        ...createEmptySectionItem(),
        intro: '**工作描述：项目二：舆情监测**\n**背景：**舆情数据检索。',
        stack: 'Java、Redis'
      }
    ]

    const normalized = normalizeResume(resume)
    const items = normalized.content.sections.find(item => item.type === 'experience')!.items

    expect(items[0]).toMatchObject({
      heading: '美团',
      intro: '项目一：事故处置',
      secondary: '事故消息处理。',
      stack: 'Java、Redis'
    })
    expect(items[1]).toMatchObject({
      intro: '项目二：舆情监测',
      secondary: '舆情数据检索。',
      stack: ''
    })
  })
})
