import { isAbsolute, relative, resolve, sep } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'

const mimeMap: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
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
  if (contentType.startsWith('video/')) {
    setHeader(event, 'Accept-Ranges', 'bytes')
    const range = getHeader(event, 'range')
    const match = range?.match(/^bytes=(\d*)-(\d*)$/)
    if (match) {
      const suffixLength = !match[1] && match[2] ? Number(match[2]) : 0
      const start = suffixLength ? Math.max(fileStat.size - suffixLength, 0) : Number(match[1] || 0)
      const end = suffixLength ? fileStat.size - 1 : match[2] ? Math.min(Number(match[2]), fileStat.size - 1) : fileStat.size - 1
      if (start > end || start >= fileStat.size) {
        setHeader(event, 'Content-Range', `bytes */${fileStat.size}`)
        throw createError({ statusCode: 416, statusMessage: 'Range Not Satisfiable' })
      }
      setResponseStatus(event, 206)
      setHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileStat.size}`)
      setHeader(event, 'Content-Length', end - start + 1)
      return sendStream(event, createReadStream(filepath, { start, end }))
    }
    setHeader(event, 'Content-Length', fileStat.size)
    return sendStream(event, createReadStream(filepath))
  }
  return readFile(filepath)
})
