// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { uploadGalleryFiles } from '../app/utils/gallery-upload'

it('continues after a failed file and retries only failures in their original group', async () => {
  const files = ['a', 'b', 'c'].map(name => new File(['image'], name + '.png'))
  const upload = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({})
  const onProgress = vi.fn()
  const failures = await uploadGalleryFiles(files, { collection: 'memes', group: 'cats', upload, errorMessage: () => 'offline', onProgress })
  expect(upload).toHaveBeenCalledTimes(3)
  expect(failures).toMatchObject([{ file: files[1], collection: 'memes', group: 'cats' }])
  expect(onProgress.mock.calls.map(args => args[0])).toEqual([1, 2, 3])
  upload.mockReset().mockResolvedValue({})
  await uploadGalleryFiles(failures.map(item => item.file), { ...failures[0]!, upload, errorMessage: () => '', onProgress })
  expect(upload).toHaveBeenCalledOnce()
  expect(upload.mock.calls[0]![0]).toBe('/api/admin/upload?purpose=meme&memeGroup=cats')
  expect(upload.mock.calls[0]![1].get('file').name).toBe('b.png')
})
