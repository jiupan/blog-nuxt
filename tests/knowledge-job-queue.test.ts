import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    knowledgeSyncJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    knowledgeDocument: { updateMany: vi.fn() },
    knowledgeFile: { updateMany: vi.fn() }
  }
}))

vi.mock('~~/server/utils/prisma', () => ({ prisma: prismaMock }))

const {
  claimNextKnowledgeJob,
  enqueueKnowledgeJob,
  failKnowledgeJob,
  recoverStaleKnowledgeJobs
} = await import('../server/services/knowledge/knowledge-job.service')

const now = new Date('2026-07-15T12:00:00.000Z')

function createJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    type: 'SINGLE_POST',
    status: 'PENDING',
    postId: 7,
    knowledgeFileId: null,
    totalItems: 1,
    completedItems: 0,
    successItems: 0,
    failedItems: 0,
    attempts: 0,
    maxAttempts: 3,
    error: null,
    activeKey: 'SINGLE_POST:post:7',
    nextRunAt: now,
    lockedAt: null,
    heartbeatAt: null,
    lockedBy: null,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('knowledge job queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockResolvedValue([])
    prismaMock.knowledgeDocument.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.knowledgeFile.updateMany.mockResolvedValue({ count: 1 })
  })

  it('deduplicates pending and running jobs for the same target', async () => {
    const existing = createJob()
    prismaMock.knowledgeSyncJob.findFirst.mockResolvedValue(existing)

    await expect(enqueueKnowledgeJob({ type: 'SINGLE_POST', postId: 7 })).resolves.toEqual({
      job: existing,
      alreadyRunning: true
    })
    expect(prismaMock.knowledgeSyncJob.create).not.toHaveBeenCalled()
  })

  it('resolves concurrent enqueue attempts through the active key', async () => {
    const existing = createJob()
    prismaMock.knowledgeSyncJob.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing)
    prismaMock.knowledgeSyncJob.create.mockRejectedValue({ code: 'P2002' })

    await expect(enqueueKnowledgeJob({ type: 'SINGLE_POST', postId: 7 })).resolves.toEqual({
      job: existing,
      alreadyRunning: true
    })
  })

  it('claims a pending job with an optimistic status and lock check', async () => {
    const candidate = createJob()
    const claimed = createJob({ status: 'RUNNING', attempts: 1, lockedBy: 'worker-1', lockedAt: now, heartbeatAt: now })
    prismaMock.knowledgeSyncJob.findMany.mockResolvedValue([candidate])
    prismaMock.knowledgeSyncJob.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.knowledgeSyncJob.findUnique.mockResolvedValue(claimed)

    await expect(claimNextKnowledgeJob('worker-1', now)).resolves.toEqual(claimed)
    expect(prismaMock.knowledgeSyncJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1, status: 'PENDING', lockedAt: null },
      data: expect.objectContaining({ status: 'RUNNING', lockedBy: 'worker-1', attempts: { increment: 1 } })
    }))
  })

  it('requeues a failed attempt with backoff while attempts remain', async () => {
    const running = createJob({ status: 'RUNNING', attempts: 1, lockedBy: 'worker-1' })
    prismaMock.knowledgeSyncJob.updateMany.mockResolvedValue({ count: 1 })

    const result = await failKnowledgeJob(running, 'worker-1', new Error('provider unavailable'))

    expect(result.retry).toBe(true)
    expect(prismaMock.knowledgeSyncJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING', error: 'provider unavailable' })
    }))
    expect(prismaMock.knowledgeDocument.updateMany).toHaveBeenCalledWith({
      where: { postId: 7 },
      data: { status: 'PENDING', lastError: 'provider unavailable' }
    })
  })

  it('marks exhausted stale jobs as failed', async () => {
    const stale = createJob({
      status: 'RUNNING',
      attempts: 3,
      lockedBy: 'dead-worker',
      heartbeatAt: new Date('2026-07-15T11:00:00.000Z')
    })
    prismaMock.knowledgeSyncJob.findMany.mockResolvedValue([stale])
    prismaMock.knowledgeSyncJob.updateMany.mockResolvedValue({ count: 1 })

    await expect(recoverStaleKnowledgeJobs(now)).resolves.toEqual({ recovered: 0, failed: 1 })
    expect(prismaMock.knowledgeDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED' })
    }))
  })

  it('does not start knowledge synchronization with request-local setImmediate callbacks', () => {
    const files = [
      join(process.cwd(), 'server/services/knowledge/knowledge.service.ts'),
      join(process.cwd(), 'server/services/knowledge-files/knowledge-file.service.ts')
    ]
    expect(files.filter(file => readFileSync(file, 'utf8').includes('setImmediate'))).toEqual([])
  })
})
