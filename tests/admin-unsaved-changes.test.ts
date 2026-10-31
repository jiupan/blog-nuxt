import { ref, computed, watch, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminUnsavedChanges } from '../app/composables/useAdminUnsavedChanges'

const confirm = vi.fn()
const addEventListener = vi.fn()
const removeEventListener = vi.fn()
let leaveGuard: () => boolean
let unmount: () => void

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onBeforeRouteLeave', (callback: () => boolean) => {
    leaveGuard = callback
  })
  vi.stubGlobal('onMounted', (callback: () => void) => callback())
  vi.stubGlobal('onBeforeUnmount', (callback: () => void) => {
    unmount = callback
  })
  vi.stubGlobal('window', { confirm, addEventListener, removeEventListener })
})

describe('admin unsaved changes', () => {
  it('treats the first loaded settings as saved, then protects edits on navigation', async () => {
    const form = ref<{ title: string } | null>(null)
    const draft = useAdminUnsavedChanges(() => form.value)
    form.value = { title: 'Loaded title' }
    await nextTick()
    expect(draft.isDirty.value).toBe(false)
    expect(leaveGuard()).toBe(true)
    form.value.title = 'Unsaved title'
    confirm.mockReturnValue(false)
    expect(draft.isDirty.value).toBe(true)
    expect(leaveGuard()).toBe(false)
    expect(form.value.title).toBe('Unsaved title')
  })

  it('keeps edits made during a pending save marked as unsaved', () => {
    const form = ref({ title: 'Original' })
    const draft = useAdminUnsavedChanges(() => form.value)
    form.value.title = 'Submitted'
    const submitted = draft.snapshot()
    form.value.title = 'Typed while saving'
    draft.markSaved(submitted)
    expect(draft.isDirty.value).toBe(true)
    draft.markSaved()
    expect(draft.isDirty.value).toBe(false)
  })

  it('warns before closing only when dirty and removes the listener on unmount', () => {
    const form = ref({ title: 'Saved' })
    useAdminUnsavedChanges(() => form.value)
    const handler = addEventListener.mock.calls[0]![1] as (event: {
      preventDefault: () => void
      returnValue?: string
    }) => void
    const event = { preventDefault: vi.fn(), returnValue: undefined as string | undefined }
    handler(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
    form.value.title = 'Unsaved'
    handler(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.returnValue).toBe('')
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('beforeunload', handler)
  })
})
