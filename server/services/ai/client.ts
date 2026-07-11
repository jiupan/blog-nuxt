import { resolveAiConfig } from './config'
import { createAiConfigError, createAiEmptyResponseError, createAiProviderError } from './errors'

type AiChatMessage = {
  role: 'system' | 'user'
  content: string
}

type AiChatJsonOptions = {
  messages: AiChatMessage[]
  temperature?: number
  failureMessage: string
}

type AiChatStreamOptions = AiChatJsonOptions & {
  signal?: AbortSignal
  onDelta: (text: string) => void | Promise<void>
}

export async function requestAiChatJson(options: AiChatJsonOptions) {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createAiConfigError()
  }

  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null) as AiChatCompletionPayload | null

  if (!response.ok) {
    const message = payload?.error?.message || options.failureMessage
    throw createAiProviderError(response.status, message)
  }

  return extractChatCompletionText(payload)
}

export async function requestAiChatStream(options: AiChatStreamOptions) {
  const aiConfig = await resolveAiConfig()
  if (!aiConfig.apiKey) throw createAiConfigError()

  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    signal: options.signal,
    headers: { Authorization: `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: aiConfig.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      stream: true
    })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as AiChatCompletionPayload | null
    throw createAiProviderError(response.status, payload?.error?.message || options.failureMessage)
  }
  if (!response.body) throw createAiEmptyResponseError()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      const data = line.startsWith('data:') ? line.slice(5).trim() : ''
      if (!data || data === '[DONE]') continue
      const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> }
      const delta = payload.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) {
        answer += delta
        await options.onDelta(delta)
      }
    }
    if (done) break
  }
  if (!answer.trim()) throw createAiEmptyResponseError()
  return answer.trim()
}

type AiChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
  error?: {
    message?: string
  }
}

function extractChatCompletionText(payload: AiChatCompletionPayload | null) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) {
    return content
  }

  throw createAiEmptyResponseError()
}
