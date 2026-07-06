import { isAbsolute, relative, resolve, sep } from 'node:path'
import { badRequest } from '~~/server/utils/api-error'

export function resolveUploadRoot(uploadDir: string) {
  return resolve(uploadDir)
}

export function resolveUploadPath(uploadRoot: string, requestedPath: string) {
  const normalizedPath = normalizeUploadPath(requestedPath)
  const filepath = resolve(uploadRoot, ...normalizedPath.split('/'))
  const relativePath = toUploadRelativePath(uploadRoot, filepath)

  if (!relativePath) {
    throw badRequest('图片路径不合法')
  }

  return {
    filepath,
    relativePath
  }
}

export function toUploadRelativePath(uploadRoot: string, filepath: string) {
  const relativePath = relative(uploadRoot, filepath)

  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath === '' || isAbsolute(relativePath)) {
    return ''
  }

  return relativePath.split(sep).join('/')
}

export function toUploadUrl(relativePath: string) {
  return `/uploads/${relativePath.split('/').filter(Boolean).join('/')}`
}

function normalizeUploadPath(value: string) {
  const trimmed = value.trim().replace(/^\/+/, '').replace(/^uploads\/+/i, '')
  const segments = trimmed.split('/').filter(Boolean)

  if (!segments.length || segments.some((segment) => segment === '.' || segment === '..')) {
    throw badRequest('图片路径不合法')
  }

  return segments.join('/')
}
