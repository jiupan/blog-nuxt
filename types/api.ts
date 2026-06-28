export type ApiResult<T> = {
  code: number
  message: string
  data: T
}

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
