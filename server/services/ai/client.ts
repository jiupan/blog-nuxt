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
