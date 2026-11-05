// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldSendChat, trapChatFocus } from '../app/utils/chat-interaction'
import { parseArticleChatInput } from '../server/services/article-chat/article-chat.schema'

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })
describe('chat keyboard interaction', () => {
  it('distinguishes sending from IME confirmation and line breaks', () => {
    const enter = { key: 'Enter', shiftKey: false, isComposing: false, keyCode: 13 }
    expect(shouldSendChat(enter)).toBe(true)
    expect(shouldSendChat({ ...enter, isComposing: true })).toBe(false)
    expect(shouldSendChat({ ...enter, keyCode: 229 })).toBe(false)
    expect(shouldSendChat({ ...enter, shiftKey: true })).toBe(false)
  })
  it('wraps keyboard focus inside the modal in both directions', () => {
    document.body.innerHTML = '<section tabindex="-1"><button>历史</button><textarea></textarea><button>发送</button></section><a href="#">背景</a>'
    const dialog = document.querySelector('section')!
    const first = dialog.querySelector('button')!, last = dialog.querySelectorAll('button')[1]!
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    last.focus()
    const forward = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    trapChatFocus(forward, dialog)
    expect(document.activeElement).toBe(first)
    expect(forward.defaultPrevented).toBe(true)
    trapChatFocus(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }), dialog)
    expect(document.activeElement).toBe(last)
  })
  it('requires the original conversation for a retry', () => {
    expect(() => parseArticleChatInput({ message: '继续解释', retryMessageId: 10 })).toThrow()
    expect(parseArticleChatInput({ message: '继续解释', conversationId: 5, retryMessageId: 10 })).toMatchObject({ retryMessageId: 10 })
  })
})
