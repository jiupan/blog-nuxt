export function useAdminUnsavedChanges(
  source: () => unknown,
  leaveMessage = '有尚未保存的修改，确定离开吗？'
) {
  const snapshot = () => JSON.stringify(source())
  const savedSnapshot = ref(snapshot())
  const isDirty = computed(() => snapshot() !== savedSnapshot.value)
  function markSaved(value = snapshot()) {
    savedSnapshot.value = value
  }
  watch(
    () => Boolean(source()),
    (loaded, previous) => {
      if (loaded && !previous) markSaved()
    }
  )
  onBeforeRouteLeave(() => !isDirty.value || window.confirm(leaveMessage))
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  return { isDirty, markSaved, snapshot }
}
