import type { MaybeRefOrGetter } from 'vue'

export function useDelayedPending(source: MaybeRefOrGetter<boolean>, delay = 120) {
  const visible = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  watch(
    () => toValue(source),
    (pending) => {
      clearTimer()

      if (!pending) {
        visible.value = false
        return
      }

      if (import.meta.server) return

      timer = setTimeout(() => {
        visible.value = true
        timer = undefined
      }, delay)
    },
    { immediate: true }
  )

  onScopeDispose(clearTimer)

  return readonly(visible)
}
