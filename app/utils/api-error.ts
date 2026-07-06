type ErrorMessageOptions = {
  fallback?: string
  unauthorized?: string
  forbidden?: string
  unique?: string
}

const DEFAULT_ERROR_MESSAGE = '操作失败，请稍后重试。'

export function getApiErrorMessage(error: unknown, options: ErrorMessageOptions = {}) {
  const statusCode = getApiErrorStatus(error)
  const code = getApiErrorCode(error)

  if ((statusCode === 401 || code === 'AUTH_REQUIRED') && options.unauthorized) {
    return options.unauthorized
  }

  if ((statusCode === 403 || code === 'ADMIN_REQUIRED') && options.forbidden) {
    return options.forbidden
  }

  const rawMessage = getApiErrorRawMessage(error)
  const zodMessage = parseFirstZodIssueMessage(rawMessage)

  if (zodMessage) {
    return zodMessage
  }

  if (options.unique && (code === 'CONFLICT' || isUniqueConstraintMessage(rawMessage))) {
    return options.unique
  }

  return rawMessage || options.fallback || DEFAULT_ERROR_MESSAGE
}

export function getApiErrorCode(error: unknown) {
  const value = error as {
    data?: {
      code?: string
      data?: {
        code?: string
      }
    }
  } | null

  return value?.data?.code || value?.data?.data?.code || ''
}

export function getApiErrorStatus(error: unknown) {
  const value = error as {
    status?: number
    statusCode?: number
    data?: {
      status?: number
      statusCode?: number
    }
  } | null

  return value?.statusCode || value?.status || value?.data?.statusCode || value?.data?.status || 0
}

export function getApiErrorRawMessage(error: unknown) {
  const value = error as {
    message?: string
    statusMessage?: string
    data?: {
      data?: {
        message?: string
        statusMessage?: string
      }
      message?: string
      statusMessage?: string
    }
  } | null

  return value?.data?.data?.message || value?.data?.data?.statusMessage || value?.data?.message || value?.data?.statusMessage || value?.statusMessage || value?.message || ''
}

export function isUniqueConstraintMessage(message: string) {
  return message.includes('Unique constraint') || message.includes('P2002')
}

export function parseFirstZodIssueMessage(message: string) {
  if (!message.trim().startsWith('[')) {
    return ''
  }

  try {
    const issues = JSON.parse(message)
    const firstIssue = Array.isArray(issues) ? issues[0] : null
    return typeof firstIssue?.message === 'string' ? firstIssue.message : ''
  } catch {
    return ''
  }
}
