import { createHash, randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCookie, setCookie } from 'h3'
import { z } from 'zod'
import { notFound, rateLimited } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { answerBlogFromResults } from '../rag/ask.service'
import { searchPostChunks } from '../rag/retrieval.service'
import { consumeFixedWindow, getClientIp, type FixedWindowStore } from '../security/rate-limit.service'
import { getKnowledgeRuntimeSettings } from '../settings/settings.service'
import type { SessionUser } from '../security/access-control.service'

const anonymousCookie = process.env.NODE_ENV === 'production' ? '__Host-article-chat' : 'article-chat'
const ipWindows: FixedWindowStore = new Map()

export const articleChatInputSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().trim().min(2, '问题至少需要 2 个字').max(300, '问题不能超过 300 个字')
})

export async function getCurrentArticleConversation(event: H3Event, slug: string) {
  const post = await requirePublishedPost(slug)
  const identity = await resolveIdentity(event)
  const conversation = await findCurrentConversation(post.id, identity)
  if (!conversation) return { conversation: null, messages: [] }
  return { conversation: { id: conversation.id, postId: conversation.postId }, messages: conversation.messages.map(toMessageDto) }
}

export async function sendArticleChatMessage(event: H3Event, slug: string, input: z.infer<typeof articleChatInputSchema>) {
  const startedAt = performance.now()
  const [post, identity, settings] = await Promise.all([requirePublishedPost(slug), resolveIdentity(event), getKnowledgeRuntimeSettings()])
  await assertUsageAllowed(event, identity, settings.dailyUserLimit, settings.ipHourlyLimit)
  const conversation = input.conversationId
    ? await requireOwnedConversation(input.conversationId, post.id, identity)
    : await getOrCreateConversation(post.id, identity)
  const history = await prisma.articleChatMessage.findMany({
    where: { conversationId: conversation.id, status: 'COMPLETED' }, orderBy: { createdAt: 'desc' }, take: 6
  }).then(items => items.reverse())
  const userMessage = await prisma.articleChatMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: input.message } })
  const retrievalQuery = buildRetrievalQuery(history, input.message)
  try {
    const results = await searchPostChunks({ query: retrievalQuery, postId: post.id, limit: settings.topK })
    const contextualQuestion = buildContextualQuestion(history, input.message)
    const answer = await answerBlogFromResults(contextualQuestion, results, settings)
    const assistantMessage = await prisma.articleChatMessage.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: answer.answer, citations: answer.citations, durationMs: Math.round(performance.now() - startedAt) }
    })
    await prisma.articleChatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } })
    return {
      conversation: { id: conversation.id, postId: post.id },
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage)
    }
  } catch (error) {
    await prisma.articleChatMessage.create({
      data: { conversationId: conversation.id, role: 'ASSISTANT', content: '回答生成失败', status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 2000) : '未知错误', durationMs: Math.round(performance.now() - startedAt) }
    }).catch(() => null)
    throw error
  }
}

export async function archiveArticleConversation(event: H3Event, slug: string, conversationId: number) {
  const [post, identity] = await Promise.all([requirePublishedPost(slug), resolveIdentity(event)])
  const conversation = await requireOwnedConversation(conversationId, post.id, identity)
  await prisma.articleChatConversation.update({ where: { id: conversation.id }, data: { status: 'ARCHIVED' } })
}

type ChatIdentity = { userId?: number, anonymousKeyHash?: string }

async function resolveIdentity(event: H3Event): Promise<ChatIdentity> {
  const session = await getUserSession(event)
  const user = session.user as SessionUser | undefined
  if (user?.id) return { userId: user.id }
  let token = getCookie(event, anonymousCookie)
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    token = randomUUID()
    setCookie(event, anonymousCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  }
  return { anonymousKeyHash: createHash('sha256').update(token).digest('hex') }
}

async function assertUsageAllowed(event: H3Event, identity: ChatIdentity, dailyLimit: number, ipHourlyLimit: number) {
  const ip = getClientIp(event)
  consumeFixedWindow(ipWindows, `article-chat:${ip}`, 60 * 60 * 1000, ipHourlyLimit, () => { throw rateLimited('当前网络提问过于频繁，请稍后再试') })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const count = await prisma.articleChatMessage.count({
    where: {
      role: 'USER', createdAt: { gte: today }, conversation: identity.userId ? { userId: identity.userId } : { anonymousKeyHash: identity.anonymousKeyHash }
    }
  })
  if (count >= dailyLimit) throw rateLimited(`今日问答额度已用完，每天最多 ${dailyLimit} 次`)
}

async function requirePublishedPost(slug: string) {
  const post = await prisma.post.findFirst({ where: { slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } }, select: { id: true, title: true } })
  if (!post) throw notFound('文章不存在')
  return post
}

function identityWhere(identity: ChatIdentity) {
  return identity.userId ? { userId: identity.userId } : { anonymousKeyHash: identity.anonymousKeyHash }
}

async function findCurrentConversation(postId: number, identity: ChatIdentity) {
  return prisma.articleChatConversation.findFirst({
    where: { postId, status: 'ACTIVE', ...identityWhere(identity) }, orderBy: { lastMessageAt: 'desc' },
    include: { messages: { where: { status: { in: ['COMPLETED', 'FAILED'] } }, orderBy: { createdAt: 'asc' }, take: 50 } }
  })
}

async function getOrCreateConversation(postId: number, identity: ChatIdentity) {
  const current = await prisma.articleChatConversation.findFirst({ where: { postId, status: 'ACTIVE', ...identityWhere(identity) }, orderBy: { lastMessageAt: 'desc' } })
  return current || prisma.articleChatConversation.create({ data: { postId, ...identityWhere(identity) } })
}

async function requireOwnedConversation(id: number, postId: number, identity: ChatIdentity) {
  const conversation = await prisma.articleChatConversation.findFirst({ where: { id, postId, status: 'ACTIVE', ...identityWhere(identity) } })
  if (!conversation) throw notFound('对话不存在或已失效')
  return conversation
}

function buildRetrievalQuery(history: Array<{ role: string, content: string }>, message: string) {
  const previousUser = [...history].reverse().find(item => item.role === 'USER')
  return previousUser ? `${previousUser.content}\n继续追问：${message}`.slice(0, 500) : message
}

function buildContextualQuestion(history: Array<{ role: string, content: string }>, message: string) {
  if (!history.length) return message
  const context = history.map(item => `${item.role === 'USER' ? '用户' : '助手'}：${item.content}`).join('\n').slice(-4000)
  return `以下是本次会话最近的对话：\n${context}\n\n用户的新问题：${message}\n请结合上下文理解指代，但只能依据提供的当前文章片段回答。`
}

function toMessageDto(message: { id: number, role: string, content: string, status: string, citations?: unknown, error?: string | null, createdAt: Date }) {
  return { id: message.id, role: message.role, content: message.content, status: message.status, citations: message.citations || [], error: message.error || null, createdAt: message.createdAt }
}
