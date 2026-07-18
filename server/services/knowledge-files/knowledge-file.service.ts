import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { z } from 'zod'
import { badRequest, conflict, notFound } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { embedTexts, resolveEmbeddingConfig } from '../embeddings/embedding.service'
import { chunkKnowledgeFile } from './file-chunker.service'
import { replaceKnowledgeFileChunks } from './file-chunk.repository'
import { parseKnowledgeFile } from './file-parser.service'
import { enqueueKnowledgeJob } from '../knowledge/knowledge-job.service'

const maxFileSize = 10 * 1024 * 1024
const maxExtractedCharacters = 2_000_000
const allowedTypes = {
  md: ['text/markdown', 'text/plain', 'application/octet-stream'],
  txt: ['text/plain', 'application/octet-stream'],
  pdf: ['application/pdf', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream']
} as const

export const knowledgeFileListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['PENDING', 'SYNCING', 'SYNCED', 'STALE', 'FAILED', 'DISABLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

export type KnowledgeFileUpload = { data: Buffer, filename?: string, type?: string }

export async function createKnowledgeFile(input: KnowledgeFileUpload) {
  const originalName = normalizeOriginalName(input.filename)
  const extension = extname(originalName).slice(1).toLowerCase() as keyof typeof allowedTypes
  validateUpload(input.data, extension, input.type)
  const fileHash = createHash('sha256').update(input.data).digest('hex')
  const duplicate = await prisma.knowledgeFile.findFirst({ where: { fileHash, enabled: true }, select: { id: true, name: true } })
  if (duplicate) throw conflict(`相同文件已存在：${duplicate.name}`)

  const storedName = `${randomUUID()}.${extension}`
  const root = await ensurePrivateRoot()
  const filepath = join(root, storedName)
  await writeFile(filepath, input.data, { mode: 0o600, flag: 'wx' })
  try {
    const file = await prisma.knowledgeFile.create({
      data: {
        name: originalName.replace(/\.[^.]+$/, '').slice(0, 200), originalName, storedName,
        mimeType: canonicalMime(extension), extension, size: input.data.length, fileHash
      }
    })
    await queueKnowledgeFileSync(file.id)
    return file
  } catch (error) {
    await rm(filepath, { force: true }).catch(() => undefined)
    throw error
  }
}

export async function listKnowledgeFiles(input: z.infer<typeof knowledgeFileListSchema>) {
  const where = {
    ...(input.search ? { name: { contains: input.search, mode: 'insensitive' as const } } : {}),
    ...(input.status ? { status: input.status } : {})
  }
  const [items, total] = await Promise.all([
    prisma.knowledgeFile.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.knowledgeFile.count({ where })
  ])
  return { items, total, page: input.page, pageSize: input.pageSize }
}

export async function getKnowledgeFile(id: number) {
  const file = await prisma.knowledgeFile.findUnique({
    where: { id },
    include: { chunks: { orderBy: { chunkIndex: 'asc' }, select: { id: true, chunkIndex: true, headingPath: true, pageNumber: true, content: true, tokenCount: true } } }
  })
  if (!file) throw notFound('知识文件不存在')
  return file
}

export async function setKnowledgeFileEnabled(id: number, enabled: boolean) {
  await requireKnowledgeFile(id)
  if (!enabled) {
    await prisma.$transaction([
      prisma.knowledgeFileChunk.deleteMany({ where: { knowledgeFileId: id } }),
      prisma.knowledgeFile.update({ where: { id }, data: { enabled: false, status: 'DISABLED', chunkCount: 0, tokenCount: 0, lastError: null } })
    ])
    return prisma.knowledgeFile.findUnique({ where: { id } })
  }
  const updated = await prisma.knowledgeFile.update({ where: { id }, data: { enabled: true, status: 'PENDING', lastError: null } })
  await queueKnowledgeFileSync(id)
  return updated
}

export async function deleteKnowledgeFile(id: number) {
  const file = await requireKnowledgeFile(id)
  await prisma.knowledgeFile.delete({ where: { id } })
  await rm(resolvePrivateFilePath(file.storedName), { force: true })
}

export async function queueKnowledgeFileSync(id: number) {
  const file = await requireKnowledgeFile(id)
  if (!file.enabled) throw badRequest('知识文件已停用')
  return enqueueKnowledgeJob({ type: 'FILE_SYNC', knowledgeFileId: id, totalItems: 1 })
}

export async function syncKnowledgeFileContent(id: number) {
  const file = await requireKnowledgeFile(id)
  if (!file.enabled) throw badRequest('知识文件已停用')
  await prisma.knowledgeFile.update({ where: { id }, data: { status: 'SYNCING', lastError: null } })
  const buffer = await readFile(resolvePrivateFilePath(file.storedName))
  const sections = await parseKnowledgeFile(buffer, file.extension)
  const extractedLength = sections.reduce((sum, item) => sum + item.content.length, 0)
  if (!extractedLength) throw badRequest('文件中没有可提取的文本内容')
  if (extractedLength > maxExtractedCharacters) throw badRequest('文件解析后的文本超过 200 万字符限制')
  const chunks = chunkKnowledgeFile(file.name, sections)
  const config = await resolveEmbeddingConfig()
  const embeddings: number[][] = []
  const batchSize = 10
  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const result = await embedTexts(chunks.slice(offset, offset + batchSize).map((chunk) => chunk.embeddingText))
    embeddings.push(...result.embeddings)
  }
  await replaceKnowledgeFileChunks(id, file.name, chunks, embeddings, config.model, config.dimensions)
  const tokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)
  return prisma.knowledgeFile.update({
    where: { id },
    data: { status: 'SYNCED', chunkCount: chunks.length, tokenCount, embeddingModel: config.model, embeddingDim: config.dimensions, lastIndexedAt: new Date(), lastError: null }
  })
}

async function requireKnowledgeFile(id: number) {
  if (!Number.isInteger(id) || id < 1) throw badRequest('无效的知识文件 ID')
  const file = await prisma.knowledgeFile.findUnique({ where: { id } })
  if (!file) throw notFound('知识文件不存在')
  return file
}

function validateUpload(buffer: Buffer, extension: keyof typeof allowedTypes, mime?: string) {
  if (!buffer.length) throw badRequest('文件内容为空')
  if (buffer.length > maxFileSize) throw badRequest('知识文件不能超过 10MB')
  if (!Object.hasOwn(allowedTypes, extension)) throw badRequest('仅支持 Markdown、TXT、PDF 和 DOCX 文件')
  const normalizedMime = String(mime || 'application/octet-stream').toLowerCase()
  if (!(allowedTypes[extension] as readonly string[]).includes(normalizedMime)) throw badRequest('文件 MIME 类型与扩展名不匹配')
  if (extension === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') throw badRequest('PDF 文件签名无效')
  if (extension === 'docx' && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) throw badRequest('DOCX 文件签名无效')
  if ((extension === 'md' || extension === 'txt') && buffer.subarray(0, 1024).includes(0)) throw badRequest('文本文件包含无效的二进制内容')
}

function normalizeOriginalName(value?: string) {
  const name = String(value || '').normalize('NFKC').replace(/[\\/\0\r\n]/g, '_').trim()
  if (!name || name.length > 240) throw badRequest('文件名无效或过长')
  return name
}

function canonicalMime(extension: keyof typeof allowedTypes) {
  return ({ md: 'text/markdown', txt: 'text/plain', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })[extension]
}

async function ensurePrivateRoot() {
  const root = resolve(String(useRuntimeConfig().knowledgeFileDir))
  await mkdir(root, { recursive: true, mode: 0o700 })
  return root
}

function resolvePrivateFilePath(storedName: string) {
  if (!/^[0-9a-f-]+\.(md|txt|pdf|docx)$/.test(storedName)) throw badRequest('知识文件存储路径无效')
  return join(resolve(String(useRuntimeConfig().knowledgeFileDir)), storedName)
}
