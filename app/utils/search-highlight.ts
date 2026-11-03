export function searchTextParts(text: string, query: string) {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return [{ text, match: false }]
  const normalized = text.toLocaleLowerCase()
  const parts: Array<{ text: string, match: boolean }> = []
  let cursor = 0
  let index = normalized.indexOf(needle)
  while (index !== -1) {
    if (index > cursor) parts.push({ text: text.slice(cursor, index), match: false })
    parts.push({ text: text.slice(index, index + needle.length), match: true })
    cursor = index + needle.length
    index = normalized.indexOf(needle, cursor)
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false })
  return parts
}
