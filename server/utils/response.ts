import type { ApiResult } from '~~/types/api'

export function ok<T>(data: T, message = '成功'): ApiResult<T> {
  return {
    code: 0,
    message,
    data
  }
}
