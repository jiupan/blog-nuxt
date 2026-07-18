import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import type { KnowledgeSyncJob } from '@prisma/client'
import { syncKnowledgeFileContent } from '../knowledge-files/knowledge-file.service'
import { executeFullKnowledgeSync, executeKnowledgePostSync } from './knowledge.service'
import {
  claimNextKnowledgeJob,
  completeKnowledgeJob,
  failKnowledgeJob,
  heartbeatKnowledgeJob,
  recoverStaleKnowledgeJobs,
  updateKnowledgeJobProgress
} from './knowledge-job.service'

export type KnowledgeWorkerOptions = {
  pollIntervalMs: number
  heartbeatIntervalMs: number
  leaseTimeoutMs: number
}

const defaultOptions: KnowledgeWorkerOptions = {
  pollIntervalMs: 2_000,
  heartbeatIntervalMs: 15_000,
  leaseTimeoutMs: 60_000
}

export async function processKnowledgeJob(job: KnowledgeSyncJob, workerId: string) {
  if (job.type === 'SINGLE_POST') {
    if (!job.postId) throw new Error('文章同步任务缺少 postId')
    await executeKnowledgePostSync(job.postId)
    await completeKnowledgeJob(job, workerId, { completedItems: 1, successItems: 1 })
    return
  }

  if (job.type === 'FILE_SYNC') {
    if (!job.knowledgeFileId) throw new Error('文件同步任务缺少 knowledgeFileId')
    await syncKnowledgeFileContent(job.knowledgeFileId)
    await completeKnowledgeJob(job, workerId, { completedItems: 1, successItems: 1 })
    return
  }

  if (job.type === 'FULL_REBUILD') {
    const result = await executeFullKnowledgeSync(progress => updateKnowledgeJobProgress(job.id, workerId, progress))
    const status = result.failedItems === 0
      ? 'COMPLETED'
      : result.successItems === 0
        ? 'FAILED'
        : 'PARTIAL_FAILED'
    await completeKnowledgeJob(job, workerId, { ...result, status })
    return
  }

  throw new Error(`暂不支持知识库任务类型：${job.type}`)
}

export async function runKnowledgeWorkerOnce(
  workerId: string,
  options: KnowledgeWorkerOptions = defaultOptions
) {
  await recoverStaleKnowledgeJobs(new Date(Date.now() - options.leaseTimeoutMs))
  const job = await claimNextKnowledgeJob(workerId)
  if (!job) return false

  const heartbeat = setInterval(() => {
    void heartbeatKnowledgeJob(job.id, workerId).catch(() => undefined)
  }, options.heartbeatIntervalMs)
  heartbeat.unref?.()

  try {
    await processKnowledgeJob(job, workerId)
  } catch (error) {
    await failKnowledgeJob(job, workerId, error)
  } finally {
    clearInterval(heartbeat)
  }
  return true
}

export function startKnowledgeJobWorker(input: Partial<KnowledgeWorkerOptions> = {}) {
  const options = normalizeWorkerOptions(input)
  const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let active: Promise<void> | undefined

  const schedule = (delay: number) => {
    if (stopped) return
    timer = setTimeout(() => {
      active = runLoop()
    }, delay)
    timer.unref?.()
  }

  const runLoop = async () => {
    try {
      const processed = await runKnowledgeWorkerOnce(workerId, options)
      schedule(processed ? 0 : options.pollIntervalMs)
    } catch (error) {
      console.error('[knowledge-worker] polling failed', error)
      schedule(options.pollIntervalMs)
    }
  }

  schedule(0)

  return {
    workerId,
    async stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      await active
    }
  }
}

function normalizeWorkerOptions(input: Partial<KnowledgeWorkerOptions>): KnowledgeWorkerOptions {
  const pollIntervalMs = boundedDuration(input.pollIntervalMs, defaultOptions.pollIntervalMs, 250)
  const heartbeatIntervalMs = boundedDuration(input.heartbeatIntervalMs, defaultOptions.heartbeatIntervalMs, 1_000)
  const leaseTimeoutMs = boundedDuration(input.leaseTimeoutMs, defaultOptions.leaseTimeoutMs, heartbeatIntervalMs * 3)
  return { pollIntervalMs, heartbeatIntervalMs, leaseTimeoutMs }
}

function boundedDuration(value: number | undefined, fallback: number, minimum: number) {
  return Number.isFinite(value) ? Math.max(Math.floor(value!), minimum) : fallback
}
