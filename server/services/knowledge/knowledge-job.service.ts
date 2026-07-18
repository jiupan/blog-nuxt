import type { KnowledgeSyncJob, KnowledgeSyncJobType, Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

const defaultMaxAttempts = 3
const retryBaseDelayMs = 5_000

export type KnowledgeJobTarget = {
  type: KnowledgeSyncJobType
  postId?: number
  knowledgeFileId?: number
  totalItems?: number
}

export async function enqueueKnowledgeJob(target: KnowledgeJobTarget) {
  const activeKey = buildActiveKey(target)
  const active = await prisma.knowledgeSyncJob.findFirst({
    where: {
      type: target.type,
      status: { in: ['PENDING', 'RUNNING'] },
      ...(target.postId ? { postId: target.postId } : {}),
      ...(target.knowledgeFileId ? { knowledgeFileId: target.knowledgeFileId } : {})
    },
    orderBy: { createdAt: 'desc' }
  })
  if (active) return { job: active, alreadyRunning: true }

  try {
    const job = await prisma.knowledgeSyncJob.create({
      data: {
        type: target.type,
        status: 'PENDING',
        postId: target.postId,
        knowledgeFileId: target.knowledgeFileId,
        totalItems: target.totalItems || 1,
        maxAttempts: defaultMaxAttempts,
        activeKey,
        nextRunAt: new Date()
      }
    })
    return { job, alreadyRunning: false }
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const job = await prisma.knowledgeSyncJob.findFirst({
      where: { activeKey, status: { in: ['PENDING', 'RUNNING'] } },
      orderBy: { createdAt: 'desc' }
    })
    if (!job) throw error
    return { job, alreadyRunning: true }
  }
}

export async function claimNextKnowledgeJob(workerId: string, now = new Date()) {
  const candidates = await prisma.knowledgeSyncJob.findMany({
    where: {
      status: 'PENDING',
      nextRunAt: { lte: now },
      lockedAt: null
    },
    orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'asc' }],
    take: 10
  })

  for (const candidate of candidates) {
    const claimed = await prisma.knowledgeSyncJob.updateMany({
      where: { id: candidate.id, status: 'PENDING', lockedAt: null },
      data: {
        status: 'RUNNING',
        attempts: { increment: 1 },
        lockedAt: now,
        heartbeatAt: now,
        lockedBy: workerId,
        startedAt: candidate.startedAt || now,
        finishedAt: null
      }
    })
    if (claimed.count === 1) {
      return prisma.knowledgeSyncJob.findUnique({ where: { id: candidate.id } })
    }
  }

  return null
}

export async function heartbeatKnowledgeJob(jobId: number, workerId: string, now = new Date()) {
  const result = await prisma.knowledgeSyncJob.updateMany({
    where: { id: jobId, status: 'RUNNING', lockedBy: workerId },
    data: { heartbeatAt: now }
  })
  return result.count === 1
}

export async function updateKnowledgeJobProgress(
  jobId: number,
  workerId: string,
  progress: { completedItems: number, successItems: number, failedItems: number }
) {
  await prisma.knowledgeSyncJob.updateMany({
    where: { id: jobId, status: 'RUNNING', lockedBy: workerId },
    data: { ...progress, heartbeatAt: new Date() }
  })
}

export async function completeKnowledgeJob(
  job: KnowledgeSyncJob,
  workerId: string,
  result: { completedItems?: number, successItems?: number, failedItems?: number, status?: 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED' } = {}
) {
  const completedItems = result.completedItems ?? job.totalItems
  const successItems = result.successItems ?? completedItems
  const failedItems = result.failedItems ?? 0
  await prisma.knowledgeSyncJob.updateMany({
    where: { id: job.id, status: 'RUNNING', lockedBy: workerId },
    data: {
      status: result.status || 'COMPLETED',
      completedItems,
      successItems,
      failedItems,
      error: result.status === 'FAILED' ? '所有同步项目均失败' : null,
      activeKey: null,
      lockedAt: null,
      heartbeatAt: null,
      lockedBy: null,
      finishedAt: new Date()
    }
  })
}

export async function failKnowledgeJob(job: KnowledgeSyncJob, workerId: string, error: unknown) {
  const message = getErrorMessage(error)
  const retry = job.attempts < job.maxAttempts
  const nextRunAt = retry
    ? new Date(Date.now() + retryBaseDelayMs * 2 ** Math.max(0, job.attempts - 1))
    : new Date()

  const updated = await prisma.knowledgeSyncJob.updateMany({
    where: { id: job.id, status: 'RUNNING', lockedBy: workerId },
    data: {
      status: retry ? 'PENDING' : 'FAILED',
      error: message,
      nextRunAt,
      lockedAt: null,
      heartbeatAt: null,
      lockedBy: null,
      ...(retry ? {} : { activeKey: null, finishedAt: new Date(), failedItems: job.totalItems })
    }
  })

  if (updated.count === 1) await markTargetFailure(job, message, !retry)
  return { retry, nextRunAt }
}

export async function recoverStaleKnowledgeJobs(staleBefore: Date) {
  const staleJobs = await prisma.knowledgeSyncJob.findMany({
    where: {
      status: 'RUNNING',
      OR: [
        { heartbeatAt: null },
        { heartbeatAt: { lt: staleBefore } }
      ]
    },
    orderBy: { createdAt: 'asc' }
  })

  let recovered = 0
  let failed = 0
  for (const job of staleJobs) {
    const exhausted = job.attempts >= job.maxAttempts
    const result = await prisma.knowledgeSyncJob.updateMany({
      where: {
        id: job.id,
        status: 'RUNNING',
        lockedBy: job.lockedBy,
        heartbeatAt: job.heartbeatAt
      },
      data: {
        status: exhausted ? 'FAILED' : 'PENDING',
        error: exhausted ? '同步任务心跳超时，重试次数已用完' : '同步任务心跳超时，已重新排队',
        nextRunAt: new Date(),
        lockedAt: null,
        heartbeatAt: null,
        lockedBy: null,
        ...(exhausted ? { activeKey: null, finishedAt: new Date(), failedItems: job.totalItems } : {})
      }
    })
    if (result.count !== 1) continue
    if (exhausted) {
      failed += 1
      await markTargetFailure(job, '同步任务心跳超时，重试次数已用完', true)
    } else {
      recovered += 1
    }
  }
  return { recovered, failed }
}

async function markTargetFailure(job: KnowledgeSyncJob, message: string, final: boolean) {
  const status = final ? 'FAILED' : 'PENDING'
  const operations: Prisma.PrismaPromise<unknown>[] = []
  if (job.postId) {
    operations.push(prisma.knowledgeDocument.updateMany({
      where: { postId: job.postId },
      data: { status, lastError: message }
    }))
  }
  if (job.knowledgeFileId) {
    operations.push(prisma.knowledgeFile.updateMany({
      where: { id: job.knowledgeFileId },
      data: { status, lastError: message }
    }))
  }
  if (operations.length) await prisma.$transaction(operations)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 2000) : '未知同步错误'
}

function buildActiveKey(target: KnowledgeJobTarget) {
  if (target.postId) return `${target.type}:post:${target.postId}`
  if (target.knowledgeFileId) return `${target.type}:file:${target.knowledgeFileId}`
  return target.type
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}
