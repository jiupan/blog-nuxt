import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { beforeEach, expect, it, vi } from 'vitest'
import { isPublicAddress, publicResourceUrl, readPublicResource } from '../server/services/bookmarks/public-resource'

const mocks = vi.hoisted(() => ({ get: vi.fn(), lookup: vi.fn() }))
vi.mock('node:https', () => ({ get: mocks.get }))
vi.mock('node:dns', () => ({ lookup: mocks.lookup }))

const deadline = () => AbortSignal.timeout(5000)
const example = new URL('https://example.org/')

beforeEach(() => vi.resetAllMocks())

it('rejects internal and reserved destinations, including obfuscated URL forms', () => {
  for (const address of ['127.1.2.3', '100.64.0.4', '169.254.169.254', '10.0.0.1', '192.168.1.1', '::1', '::ffff:8.8.8.8', 'fe80::1', 'fd00::1', '2001:db8::1']) {
    expect(isPublicAddress(address), address).toBe(false)
  }
  expect(isPublicAddress('1.1.1.1')).toBe(true)
  expect(isPublicAddress('2606:4700:4700::1111')).toBe(true)
  expect(() => publicResourceUrl('http://0x7f000001')).toThrow('内网')
  expect(() => publicResourceUrl('https://u:p@example.org')).toThrow('公开 HTTP')
})

it('checks every redirect before opening another connection', async () => {
  respond(302, { location: 'http://169.254.169.254/latest/' })
  await expect(readPublicResource(example, 'html', deadline())).rejects.toThrow('内网')
  expect(mocks.get).toHaveBeenCalledTimes(1)
})

it('passes verified DNS answers to the socket and rejects mixed public and private answers', async () => {
  const publicAnswers = [{ address: '1.1.1.1', family: 4 }]
  const record = vi.fn()
  mocks.lookup.mockImplementationOnce((_host, _options, callback) => callback(null, publicAnswers))
    .mockImplementationOnce((_host, _options, callback) => callback(null, [...publicAnswers, { address: '127.0.0.1', family: 4 }]))
  mocks.get.mockImplementation((_url, options, onResponse) => {
    const req = new EventEmitter()
    queueMicrotask(() => options.lookup('example.org', { all: true }, (error: Error, addresses: unknown) => {
      if (error) req.emit('error', error)
      else {
        record(addresses)
        onResponse(response(200, { 'content-type': 'text/html' }, [Buffer.from('<title>ok</title>')]))
      }
    }))
    return req
  })
  await expect(readPublicResource(example, 'html', deadline())).resolves.toMatchObject({ type: 'text/html' })
  expect(record).toHaveBeenCalledWith(publicAnswers)
  await expect(readPublicResource(example, 'html', deadline())).rejects.toThrow('内网')
  expect(record).toHaveBeenCalledTimes(1)
})

it('rejects an oversized streaming icon even without a Content-Length header', async () => {
  respond(200, { 'content-type': 'image/png' }, [Buffer.alloc(1024 * 1024), Buffer.alloc(1)])
  await expect(readPublicResource(example, 'image', deadline())).rejects.toThrow('文件过大')
})

function response(statusCode: number, headers: Record<string, string>, chunks: Buffer[] = []) {
  return Object.assign(Readable.from(chunks), { statusCode, headers })
}

function respond(status: number, headers: Record<string, string>, chunks?: Buffer[]) {
  mocks.get.mockImplementationOnce((_url, _options, onResponse) => {
    queueMicrotask(() => onResponse(response(status, headers, chunks)))
    return new EventEmitter()
  })
}
