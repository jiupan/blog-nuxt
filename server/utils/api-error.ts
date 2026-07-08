import { createError } from 'h3'
import type { ApiErrorCode, ApiErrorData } from '~~/types/api'

type ApiErrorOptions = {
  statusCode: number
  statusMessage: string
  code: ApiErrorCode | string
  details?: Record<string, unknown>
}

export const API_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED'
} as const

export function fail(options: ApiErrorOptions) {
  const data: ApiErrorData = {
    code: options.code,
    message: options.statusMessage,
    ...options.details
  }

  return createError({
    statusCode: options.statusCode,
    message: options.statusMessage,
    data
  })
}

export function badRequest(statusMessage: string, details?: Record<string, unknown>) {
  return fail({
    statusCode: 400,
    statusMessage,
    code: API_ERROR_CODES.BAD_REQUEST,
    details
  })
}

export function validationError(statusMessage: string, details?: Record<string, unknown>) {
  return fail({
    statusCode: 400,
    statusMessage,
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details
  })
}

export function unauthorized(statusMessage = '未登录或登录已过期') {
  return fail({
    statusCode: 401,
    statusMessage,
    code: API_ERROR_CODES.AUTH_REQUIRED
  })
}

export function forbidden(statusMessage = '没有后台访问权限') {
  return fail({
    statusCode: 403,
    statusMessage,
    code: API_ERROR_CODES.ADMIN_REQUIRED
  })
}

export function notFound(statusMessage: string, details?: Record<string, unknown>) {
  return fail({
    statusCode: 404,
    statusMessage,
    code: API_ERROR_CODES.NOT_FOUND,
    details
  })
}

export function conflict(statusMessage: string, details?: Record<string, unknown>) {
  return fail({
    statusCode: 409,
    statusMessage,
    code: API_ERROR_CODES.CONFLICT,
    details
  })
}

export function rateLimited(statusMessage: string, details?: Record<string, unknown>) {
  return fail({
    statusCode: 429,
    statusMessage,
    code: API_ERROR_CODES.RATE_LIMITED,
    details
  })
}
