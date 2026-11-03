import { describe, expect, it } from 'vitest'
import { searchTextParts } from '../app/utils/search-highlight'

describe('search text highlighting', () => {
  it('matches all occurrences without changing the original text', () => {
    const parts = searchTextParts('AI 编程与 ai 应用', ' AI ')
    expect(parts.filter(part => part.match).map(part => part.text)).toEqual(['AI', 'ai'])
    expect(parts.map(part => part.text).join('')).toBe('AI 编程与 ai 应用')
  })

  it('treats punctuation as literal search text', () => {
    expect(searchTextParts('C++ 与 [AI]', 'C++')[0]).toEqual({ text: 'C++', match: true })
    expect(searchTextParts('C++ 与 [AI]', '[AI]').at(-1)).toEqual({ text: '[AI]', match: true })
  })

  it('keeps HTML-like text as plain text for Vue to escape', () => {
    const text = '<img src=x onerror=alert(1)> AI'
    expect(searchTextParts(text, 'AI')).toEqual([{ text: '<img src=x onerror=alert(1)> ', match: false }, { text: 'AI', match: true }])
  })

  it('handles empty and unmatched queries', () => {
    expect(searchTextParts('文章', ' ')).toEqual([{ text: '文章', match: false }])
    expect(searchTextParts('文章', '其他')).toEqual([{ text: '文章', match: false }])
  })
})
