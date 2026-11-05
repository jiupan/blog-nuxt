import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { CommentStatusPayload } from '../../types/dto/comment'
import { pickField, type ResolvedMapping } from './comment-mapping'

export type RawRecord = Record<string, unknown>

export type SourceReadResult = {
  records: RawRecord[]
  /** 识别出的输入格式，写进报告方便对账。 */
  format: string
  /** 解析失败的行数。 */
  unparsed: number
}

/** 可能承载评论数组的顶层键。 */
const ARRAY_KEYS = ['docs', 'comments', 'records', 'items', 'rows', 'list', 'data']

/**
 * 读取上游备份。
 *
 * 容器卷的实际形态要等样本确认，所以这里同时接受四种常见形态：
 * JSON 数组、LokiJS 导出（collections）、Mongo 风格（docs）与 JSONL。
 * 认不出来时按 JSONL 逐行解析，坏行跳过并计数。
 */
export function parseSourceContent(text: string): SourceReadResult {
  const trimmed = text.trim()
  if (!trimmed) return { records: [], format: 'empty', unparsed: 0 }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const fromJson = extractRecords(parsed)
      if (fromJson) return { records: fromJson.records, format: fromJson.format, unparsed: 0 }
    } catch {
      // 落到 JSONL 分支。
    }
  }

  const records: RawRecord[] = []
  let unparsed = 0

  for (const line of trimmed.split(/\r?\n/)) {
    const value = line.trim()
    if (!value) continue

    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        records.push(parsed as RawRecord)
      } else {
        unparsed += 1
      }
    } catch {
      unparsed += 1
    }
  }

  return { records, format: 'jsonl', unparsed }
}

export async function readSourceFile(filePath: string): Promise<SourceReadResult> {
  const text = await readFile(filePath, 'utf8')
  return parseSourceContent(text)
}

function extractRecords(parsed: unknown): { records: RawRecord[]; format: string } | null {
  if (Array.isArray(parsed)) {
    return { records: parsed.filter(isPlainRecord), format: 'json-array' }
  }

  if (!isPlainRecord(parsed)) return null

  const collections = parsed.collections
  if (Array.isArray(collections)) {
    const buckets = collections.filter(isPlainRecord)
    const commentBucket = buckets.find((bucket) => /comment/i.test(String(bucket.name ?? '')))
    const chosen = commentBucket ?? buckets[0]
    if (chosen && Array.isArray(chosen.data)) {
      return {
        records: (chosen.data as unknown[]).filter(isPlainRecord),
        format: 'loki-collections'
      }
    }
  }

  for (const key of ARRAY_KEYS) {
    const value = parsed[key]
    if (Array.isArray(value)) {
      return { records: value.filter(isPlainRecord), format: `json-object:${key}` }
    }
    if (isPlainRecord(value)) {
      const nested = Object.values(value).filter(Array.isArray)
      if (nested.length === 1) {
        return { records: (nested[0] as unknown[]).filter(isPlainRecord), format: `json-object:${key}` }
      }
    }
  }

  return null
}

function isPlainRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export type MediaConversion = {
  kind: 'image' | 'emoji'
  /** 只留域名与路径，查询串可能带签名，不进报告。 */
  source: string
}

/** 一次转换的记账信息。 */
export type LegacyRecord = {
  sourceId: string
  /** 来源 ID 是派生的，没有稳定 ID 时要单独报告。 */
  sourceIdDerived: boolean
  /** 原始地址。 */
  url: string
  /** 从地址里取出来的路径。 */
  path: string
  /** 地址里的站点域名。 */
  host: string | null
  parentSourceId: string | null
  replyToSourceId: string | null
  replyToNickname: string | null
  nickname: string
  body: string
  createdAt: Date | null
  /** 点赞数。字段缺失时留空，不补 0。 */
  likeCount: number | null
  status: CommentStatusPayload
  /** 状态是不是明确识别出来的。 */
  statusKnown: boolean
  mediaConversions: MediaConversion[]
}

export type NormalizeResult = {
  record: LegacyRecord
  /** 状态无法判定时为 true，记录由调用方报告。 */
  statusUnknown: boolean
}

/**
 * 把上游记录归一化成内部结构。
 *
 * 字段名全部走候选映射，来源 ID 缺失时用记录内容派生一个稳定值 ——
 * 同一份输入重跑得到同一个 ID，幂等才成立。
 *
 * 这里不做「要不要导入」的判断，空正文与坏时间留给计划阶段，
 * 这样每条原始记录都能在报告里找到落点。
 */
export function normalizeRecord(raw: RawRecord, mapping: ResolvedMapping): NormalizeResult {
  const rawSourceId = pickField(raw, mapping.fields.sourceId)
  const sourceIdDerived = rawSourceId === undefined
  const sourceId = sourceIdDerived
    ? deriveSourceId(raw)
    : stringifyId(rawSourceId)

  const url = stringifyId(pickField(raw, mapping.fields.url) ?? '')
  const { path, host } = splitUrl(url)

  const createdRaw = pickField(raw, mapping.fields.createdAt)
  const createdAt = createdRaw === undefined ? null : parseDate(createdRaw)

  // 状态先算：旧站删除评论时会把正文清空，正文为空本身不算异常。
  //
  // 只有明确命中映射表才算识别成功。字段缺失与值不认识都按未知处理，
  // 落到兜底状态，绝不自动变可见。
  const statusRaw = pickField(raw, mapping.fields.status, { allowEmptyString: true })
  const statusKey = statusRaw === undefined
    ? ''
    : stringifyId(statusRaw).trim().toLowerCase()
  const statusKnown = statusRaw !== undefined && mapping.statusMap[statusKey] !== undefined
  const status = statusKnown ? mapping.statusMap[statusKey]! : mapping.defaultStatus

  const body = stringifyId(pickField(raw, mapping.fields.body) ?? '')

  const likeRaw = pickField(raw, mapping.fields.likeCount)
  const likeCount = likeRaw === undefined ? null : toInteger(likeRaw)

  const { body: convertedBody, conversions } = convertLegacyMedia(body, mapping)

  return {
    record: {
      sourceId,
      sourceIdDerived,
      url,
      path,
      host,
      parentSourceId: optionalId(pickField(raw, mapping.fields.parentId)),
      replyToSourceId: optionalId(pickField(raw, mapping.fields.replyToId)),
      replyToNickname: optionalId(pickField(raw, mapping.fields.replyToNickname)),
      nickname: stringifyId(pickField(raw, mapping.fields.nickname) ?? ''),
      body: convertedBody,
      createdAt,
      likeCount,
      status,
      statusKnown,
      mediaConversions: conversions
    },
    statusUnknown: !statusKnown
  }
}

/**
 * 转换旧正文里的图片与表情。
 *
 * 只做确定性替换，不抓取任何远端资源：图片改成指向原地址的链接，
 * 表情单独计数，转换条数写进报告。
 */
export function convertLegacyMedia(
  body: string,
  mapping: ResolvedMapping
): { body: string; conversions: MediaConversion[] } {
  const conversions: MediaConversion[] = []

  const converted = body.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = readAttribute(tag, 'src')
    if (!src) return ''

    const kind = isEmoji(tag, src, mapping) ? 'emoji' : 'image'
    conversions.push({ kind, source: stripQuery(src) })

    const label = kind === 'emoji' ? '[表情]' : '[图片]'
    return `<a href="${escapeAttribute(src)}" target="_blank" rel="nofollow noopener noreferrer">${label}</a>`
  })

  return { body: converted, conversions }
}

function isEmoji(tag: string, src: string, mapping: ResolvedMapping): boolean {
  if (/class\s*=\s*["'][^"']*emoji/i.test(tag)) return true

  const host = readHost(src)
  if (!host) return false

  return mapping.emojiHosts.includes(host)
}

/** 记录内容派生稳定 ID。只在同一份输入上稳定，不跨输入。 */
function deriveSourceId(raw: RawRecord): string {
  const canonical = Object.keys(raw)
    .sort()
    .map((key) => `${key}=${JSON.stringify(raw[key])}`)
    .join('&')

  return `derived-${createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`
}

function stringifyId(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isPlainRecord(value)) {
    const nested = value._id ?? value.id ?? value.$oid
    if (nested !== undefined) return stringifyId(nested)
  }
  return String(value)
}

/** 父子字段的空值一律当成没有，空串、0、null 都算。 */
function optionalId(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '0') return null
    return trimmed
  }
  if (typeof value === 'number') return value === 0 ? null : String(value)
  return null
}

function toInteger(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null
}

/**
 * 解析时间。
 *
 * 兼容 ISO 字符串、epoch 秒与 epoch 毫秒，以及 "YYYY-MM-DD HH:mm:ss"。
 * 后者按 UTC 处理，避免同一条记录在不同机器上落到不同时间点。
 */
export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === 'number') {
    const ms = value > 1e11 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const text = String(value ?? '').trim()
  if (!text) return null

  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text)
    return parseDate(numeric)
  }

  const spaceForm = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)$/.exec(text)
  if (spaceForm) {
    const iso = `${spaceForm[1]}T${spaceForm[2]}${spaceForm[3] ? '' : ':00'}Z`
    const parsed = new Date(iso)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** 从地址里拆出路径与域名。相对路径也算。 */
export function splitUrl(url: string): { path: string; host: string | null } {
  const value = url.trim()
  if (!value) return { path: '', host: null }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      return { path: parsed.pathname, host: parsed.host.toLowerCase() }
    } catch {
      return { path: value, host: null }
    }
  }

  return { path: value.split(/[?#]/)[0] ?? value, host: null }
}

function readAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const match = pattern.exec(tag)
  if (!match) return null
  return match[2] ?? match[3] ?? match[4] ?? null
}

function readHost(url: string): string | null {
  if (!/^https?:\/\//i.test(url)) return null
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return null
  }
}

/** 去掉查询串。签名参数不能进报告。 */
function stripQuery(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? url
  try {
    if (/^https?:\/\//i.test(withoutQuery)) {
      const parsed = new URL(withoutQuery)
      return `${parsed.host}${parsed.pathname}`
    }
  } catch {
    return withoutQuery
  }
  return withoutQuery
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
