import { isAbsolute, relative, resolve, sep } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

const mimeMap: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const uploadRoot = resolve(config.uploadDir)
  const requestedPath = getRouterParams(event).path || ''
  const filepath = resolve(uploadRoot, ...requestedPath.split('/').filter(Boolean))
  const relativePath = relative(uploadRoot, filepath)

  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath === '' || isAbsolute(relativePath)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const fileStat = await stat(filepath).catch(() => null)
  if (!fileStat?.isFile()) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const ext = filepath.slice(filepath.lastIndexOf('.')).toLowerCase()
  const contentType = mimeMap[ext] || 'application/octet-stream'
  setHeader(event, 'Content-Type', contentType)
  return readFile(filepath)
})
