const fenceStart = /^(`{3,})(?:json)?[ \t]*\r?\n/i
const answerField = /(?:^\s*\{|,)\s*"(?:answer|回答)"\s*:/
const wrapperFields = new Set(['answer', '回答', 'citationIds', 'citations', '引用', '引用来源', '参考章节'])

export function unwrapArticleAnswer(value: string): string | null {
  const text = value.trim()
  const fence = fenceStart.exec(text)
  const json = fence
    ? text.slice(fence[0].length, text.endsWith(fence[1]!) ? -fence[1]!.length : undefined).trim()
    : text
  if (!json.startsWith('{')) return value

  try {
    const fields = JSON.parse(json) as Record<string, unknown>
    const key = Object.hasOwn(fields, 'answer') ? 'answer' : '回答'
    if (!Object.hasOwn(fields, key)) return value
    const answer = fields[key]
    const knownShape = Object.keys(fields).every(field => wrapperFields.has(field))
    if (typeof answer === 'string' && answer.trim() && (!fence || knownShape)) return answer.trim()
    return knownShape ? null : value
  } catch {
    return answerField.test(json) ? null : value
  }
}

// Only an opening object or a JSON fence needs buffering. Ordinary Markdown streams as it arrives.
function shouldBufferArticleAnswer(value: string) {
  const prefix = value.trimStart()
  return !prefix || prefix.startsWith('{') || /^`{1,}$/.test(prefix) ||
    /^`{3,}(?:j(?:s(?:o(?:n)?)?)?)?[ \t]*\r?$/i.test(prefix) ||
    (/^`{3,}(?:json)?[ \t]*\r?\n/i.test(prefix) && !/^`{3,}(?:json)?[ \t]*\r?\n\s*[^\s{]/i.test(prefix))
}

export function createArticleAnswerWriter(onDelta: (text: string) => void | Promise<void>) {
  let prefix = ''
  let started = false
  return {
    async push(delta: string) {
      if (started) return onDelta(delta)
      prefix += delta
      if (shouldBufferArticleAnswer(prefix)) return
      started = true
      await onDelta(prefix)
      prefix = ''
    },
    async finish(rawAnswer: string) {
      const answer = unwrapArticleAnswer(rawAnswer)
      if (!started && answer) await onDelta(answer)
      return answer
    }
  }
}
