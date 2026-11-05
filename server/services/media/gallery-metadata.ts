import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { resolveUploadRoot } from './path-safety'

const schema = z.record(z.string(), z.object({
  inRandomPool: z.boolean().optional(),
  randomEnabled: z.boolean().optional(),
  memeGroup: z.string().nullable().optional(),
  displayName: z.string().optional()
}))
export type GalleryMetadata = z.infer<typeof schema>[string]
let writes: Promise<unknown> = Promise.resolve()

export async function readGalleryMetadata(root = resolveUploadRoot(useRuntimeConfig().uploadDir)) {
  const filename = join(root, '.gallery.json')
  const content = await readFile(filename, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '{}'
    throw error
  })
  return schema.parse(JSON.parse(content))
}

/** 保留文件 URL，通过元数据调整用途；串行、原子保存，避免并发批量操作覆盖彼此。 */
export function updateGalleryMetadata(paths: string[], changes: GalleryMetadata) {
  const root = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const operation = writes.then(async () => {
    const metadata = await readGalleryMetadata(root)
    for (const path of paths) metadata[path] = { ...metadata[path], ...changes }
    await mkdir(root, { recursive: true })
    const filename = join(root, '.gallery.json')
    const temporary = `${filename}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(metadata, null, 2), 'utf8')
    await rename(temporary, filename)
  })
  writes = operation.catch(() => {})
  return operation
}
