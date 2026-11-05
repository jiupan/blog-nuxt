export type GalleryCollection = 'images' | 'covers' | 'memes'
export type FailedGalleryUpload = { file: File, collection: GalleryCollection, group: string, error: string }

/** 单文件失败不打断其余文件；失败项保留原目标，供切换图库后的重试使用。 */
export async function uploadGalleryFiles(files: File[], options: {
  collection: GalleryCollection
  group: string
  upload: (url: string, body: FormData) => Promise<unknown>
  errorMessage: (error: unknown) => string
  onProgress: (processed: number) => void
}): Promise<FailedGalleryUpload[]> {
  const failures: FailedGalleryUpload[] = []
  const { collection, group } = options
  const url = collection === 'covers' ? '/api/admin/upload?purpose=cover&randomPool=true'
    : collection === 'memes' ? `/api/admin/upload?purpose=meme${group === 'ungrouped' ? '' : `&memeGroup=${encodeURIComponent(group)}`}`
      : '/api/admin/upload'
  for (const [index, file] of files.entries()) {
    const body = new FormData()
    body.append('file', file)
    try { await options.upload(url, body) }
    catch (error) { failures.push({ file, collection, group, error: options.errorMessage(error) }) }
    options.onProgress(index + 1)
  }
  return failures
}
