import { fail } from '../../utils/api-error'

export const AI_ERROR_CODES = {
  CONFIG_MISSING_KEY: 'AI_CONFIG_MISSING_KEY',
  PROVIDER_REQUEST_FAILED: 'AI_PROVIDER_REQUEST_FAILED',
  PROVIDER_EMPTY_RESPONSE: 'AI_PROVIDER_EMPTY_RESPONSE',
  RESPONSE_INVALID_JSON: 'AI_RESPONSE_INVALID_JSON',
  RESPONSE_INVALID_SCHEMA: 'AI_RESPONSE_INVALID_SCHEMA',
  CONTENT_INSUFFICIENT: 'AI_CONTENT_INSUFFICIENT',
  QUOTA_BLOCKED: 'AI_QUOTA_BLOCKED',
  RATE_LIMITED: 'AI_RATE_LIMITED'
} as const

export type AiErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES]

type AiErrorOptions = {
  code: AiErrorCode
  statusCode: number
  statusMessage: string
  details?: Record<string, unknown>
}

export function createAiError(options: AiErrorOptions) {
  return fail({
    statusCode: options.statusCode,
    statusMessage: options.statusMessage,
    code: options.code,
    details: options.details
  })
}

export function createAiConfigError() {
  return createAiError({
    code: AI_ERROR_CODES.CONFIG_MISSING_KEY,
    statusCode: 500,
    statusMessage: '未配置 AI API Key'
  })
}

export function createAiProviderError(statusCode: number, statusMessage: string) {
  return createAiError({
    code: AI_ERROR_CODES.PROVIDER_REQUEST_FAILED,
    statusCode,
    statusMessage,
    details: {
      providerStatusCode: statusCode
    }
  })
}

export function createAiEmptyResponseError() {
  return createAiError({
    code: AI_ERROR_CODES.PROVIDER_EMPTY_RESPONSE,
    statusCode: 502,
    statusMessage: 'AI 返回内容为空'
  })
}

export function createAiInvalidJsonError() {
  return createAiError({
    code: AI_ERROR_CODES.RESPONSE_INVALID_JSON,
    statusCode: 502,
    statusMessage: 'AI 返回格式不是有效 JSON'
  })
}

export function createAiInvalidSchemaError(statusMessage: string) {
  return createAiError({
    code: AI_ERROR_CODES.RESPONSE_INVALID_SCHEMA,
    statusCode: 502,
    statusMessage
  })
}

export function createAiContentInsufficientError(statusMessage: string) {
  return createAiError({
    code: AI_ERROR_CODES.CONTENT_INSUFFICIENT,
    statusCode: 400,
    statusMessage
  })
}

export function createAiQuotaBlockedError(statusMessage: string) {
  return createAiError({
    code: AI_ERROR_CODES.QUOTA_BLOCKED,
    statusCode: 429,
    statusMessage
  })
}

export function createAiRateLimitedError(statusMessage: string) {
  return createAiError({
    code: AI_ERROR_CODES.RATE_LIMITED,
    statusCode: 429,
    statusMessage
  })
}
