export type ApiResult<T> = {
  code: number
  message: string
  data: T
}

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'ADMIN_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'AI_CONFIG_MISSING_KEY'
  | 'AI_PROVIDER_REQUEST_FAILED'
  | 'AI_PROVIDER_EMPTY_RESPONSE'
  | 'AI_RESPONSE_INVALID_JSON'
  | 'AI_RESPONSE_INVALID_SCHEMA'
  | 'AI_CONTENT_INSUFFICIENT'
  | 'AI_QUOTA_BLOCKED'
  | 'AI_RATE_LIMITED'

export type ApiErrorData = {
  code?: ApiErrorCode | string
  message?: string
  issues?: Array<{
    path?: Array<string | number>
    message: string
  }>
  [key: string]: unknown
}

export type ApiErrorResult = {
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: ApiErrorData
}

export type PaginationPayload<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type CountPayload = {
  total: number
}

export type GalleryImagePayload = {
  name: string
  url: string
  size?: number
  width?: number | null
  height?: number | null
  collection?: string
  updatedAt: string
}

export type * from './dto/post'
export type * from './dto/taxonomy'
export type * from './dto/menu'
export type * from './dto/settings'
export type * from './dto/ai'
