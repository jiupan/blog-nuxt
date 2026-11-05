import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCookie, setCookie } from 'h3'
import { commentDisabled, unauthorized, validationError } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import type { SessionUser } from '../security/access-control.service'

/**
 * 访客凭证 Cookie。
 *
 * 生产环境用 __Host- 前缀：浏览器只接受 Secure + Path=/ + 无 Domain 的形式，
 * 页面 JS 读不到，避免 XSS 直接偷走凭证。非生产环境没有 Secure 要求，用普通名字。
 */
export const GUEST_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-blog-comment' : 'blog-comment'

const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 180
const GUEST_COOKIE_VERSION = 'v1'

/** randomBytes(32) 的 base64url 长度固定为 43。 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/**
 * 保留昵称。访客不能用这些名字冒充站方或管理员。
 * 判定时忽略大小写与所有空白，所以 "Admin" 和 "ad min" 都会被拦下。
 */
const RESERVED_DISPLAY_NAMES = new Set([
  '博主',
  '管理员',
  '站长',
  '作者',
  '官方',
  '客服',
  'admin',
  'administrator',
  'blogger',
  'owner',
  'root',
  'moderator'
])

/**
 * 控制字符与格式字符（零宽、双向文本控制符、BOM 等）。
 * \p{Cc} 覆盖控制字符，\p{Cf} 覆盖 U+200B-200F、U+202A-202E、U+2060-2064、U+2066-2069、U+FEFF。
 */
const INVISIBLE_PATTERN = /[\p{Cc}\p{Cf}]/gu

/** 全角字母数字转半角，用于保留名比对。 */
const FULLWIDTH_PATTERN = /[！-～]/gu

export type CommentAuthorKind = 'ACCOUNT' | 'GUEST'

export type CommentIdentity = {
  kind: CommentAuthorKind
  /** 写入 Comment.authorUserId。访客身份恒为 null —— 不关联任何账户。 */
  authorUserId: number | null
  /** 写入 Comment.guestTokenHash。只存摘要，不存明文。 */
  guestTokenHash: string | null
  /** 写入 Comment.authorName 的展示名快照。 */
  displayName: string
  /**
   * 限流配额归属的账户 id。
   * 已登录用户选择访客身份时，authorUserId 仍为 null，但账户限额照样扣减，
   * 否则换个身份就能绕过按账户计的配额。
   */
  quotaUserId: number | null
}

export type GuestCredential = {
  token: string
  nickname: string
}

/**
 * 当前访问者。
 * 决定 canDelete，也决定公开评论响应不能进共享缓存。
 */
export type CommentViewer = {
  userId: number | null
  guestTokenHash: string | null
}

export type SessionAccount = {
  id: number
  username: string
  status: string
}

/**
 * 解析提交者的身份。
 *
 * 账号身份要求有会话且账户在库里仍是 ACTIVE，展示会话对应的用户名 —— 客户端传的名字一律不认。
 * 访客身份允许登录用户选择：此时不关联账户，但仍然按访客走审核队列。
 */
export async function resolveCommentIdentity(
  event: H3Event,
  input: { identityMode: CommentAuthorKind, displayName?: string }
): Promise<CommentIdentity> {
  const account = await loadSessionAccount(event)

  if (input.identityMode === 'ACCOUNT') {
    if (!account) throw unauthorized('请先登录后再评论')
    if (account.status !== 'ACTIVE') throw commentDisabled()

    return {
      kind: 'ACCOUNT',
      authorUserId: account.id,
      guestTokenHash: null,
      displayName: account.username,
      quotaUserId: account.id
    }
  }

  // 访客身份。被禁用的账户不能靠切访客身份绕过禁用。
  if (account && account.status !== 'ACTIVE') throw commentDisabled()

  const credential = ensureGuestCredential(event)
  const displayName = input.displayName
    ? assertUsableDisplayName(input.displayName)
    : credential.nickname

  return {
    kind: 'GUEST',
    authorUserId: null,
    guestTokenHash: hashGuestToken(credential.token),
    displayName,
    quotaUserId: account?.id ?? null
  }
}

/** 取当前访客凭证摘要，没有凭证时返回 null。用于自助删除时校验归属。 */
export function getGuestTokenHash(event: H3Event): string | null {
  const parsed = parseGuestCookie(getCookie(event, GUEST_COOKIE_NAME))
  return parsed ? hashGuestToken(parsed.token) : null
}

/**
 * 只读地解析当前访问者，不签发任何凭证。
 * 公开列表用它算 canDelete，没有访客 Cookie 的访客不会因此拿到一个 Cookie。
 */
export async function resolveCommentViewer(event: H3Event): Promise<CommentViewer> {
  const session = await getUserSession(event)
  const sessionUser = session.user as SessionUser | undefined

  return {
    userId: sessionUser?.id ?? null,
    guestTokenHash: getGuestTokenHash(event)
  }
}

/** 取当前登录账户。库里没有对应记录时返回 null。 */
export async function resolveSessionAccount(event: H3Event): Promise<SessionAccount | null> {
  return loadSessionAccount(event)
}

/** 访客凭证摘要。库里只存这个，不存明文 token。 */
export function hashGuestToken(token: string): string {
  return createHash('sha256').update(`comment-guest:${token}`).digest('hex')
}

/**
 * 读取访客凭证，没有就现场签发一个。
 * token 与匿名昵称一起存在 Cookie 里，保证同一浏览器多次发言显示同一个昵称。
 */
export function ensureGuestCredential(event: H3Event): GuestCredential {
  const parsed = parseGuestCookie(getCookie(event, GUEST_COOKIE_NAME))
  const token = parsed?.token ?? randomBytes(32).toString('base64url')
  const nickname = parsed?.nickname ?? generateAnonymousNickname()

  if (!parsed?.nickname) {
    writeGuestCredential(event, { token, nickname })
  }

  return { token, nickname }
}

/** 昵称合法性校验。保留名与纯符号名都拒绝。 */
export function assertUsableDisplayName(value: string): string {
  const normalized = normalizeDisplayName(value)
  if (normalized.length === 0) {
    throw validationError('昵称不可用，请更换一个')
  }
  if (RESERVED_DISPLAY_NAMES.has(reservedKey(normalized))) {
    throw validationError('昵称不可用，请更换一个')
  }
  return normalized
}

/** 去掉控制字符与零宽字符，空白折叠成单个半角空格。 */
export function normalizeDisplayName(value: string): string {
  return value
    .replace(INVISIBLE_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 保留名比对键：忽略大小写、空白与常见同形字符。 */
function reservedKey(value: string): string {
  return value
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(FULLWIDTH_PATTERN, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

function generateAnonymousNickname(): string {
  return `访客${randomInt(1000, 9999)}`
}

async function loadSessionAccount(event: H3Event): Promise<SessionAccount | null> {
  const session = await getUserSession(event)
  const sessionUser = session.user as SessionUser | undefined
  if (!sessionUser?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, username: true, status: true }
  })
  if (!user) return null

  return user
}

function parseGuestCookie(raw: string | undefined): { token: string, nickname: string | null } | null {
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3 || parts[0] !== GUEST_COOKIE_VERSION) return null

  const token = parts[1] ?? ''
  if (!TOKEN_PATTERN.test(token)) return null

  return { token, nickname: decodeNickname(parts[2] ?? '') }
}

function decodeNickname(value: string): string | null {
  if (!value) return null

  try {
    const decoded = normalizeDisplayName(Buffer.from(value, 'base64url').toString('utf8'))
    if (decoded.length === 0) return null
    if (RESERVED_DISPLAY_NAMES.has(reservedKey(decoded))) return null
    return decoded
  } catch {
    return null
  }
}

function writeGuestCredential(event: H3Event, credential: GuestCredential) {
  setCookie(event, GUEST_COOKIE_NAME, serializeGuestCookie(credential), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE
  })
}

function serializeGuestCookie(credential: GuestCredential): string {
  const nickname = Buffer.from(credential.nickname, 'utf8').toString('base64url')
  return `${GUEST_COOKIE_VERSION}.${credential.token}.${nickname}`
}
