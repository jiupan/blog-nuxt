import { startKnowledgeJobWorker } from '~~/server/services/knowledge/knowledge-job.worker'

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig()
  if (!config.knowledgeWorkerEnabled) return

  const worker = startKnowledgeJobWorker({
    pollIntervalMs: config.knowledgeWorkerPollIntervalMs,
    heartbeatIntervalMs: config.knowledgeWorkerHeartbeatIntervalMs,
    leaseTimeoutMs: config.knowledgeWorkerLeaseTimeoutMs
  })

  nitroApp.hooks.hook('close', () => worker.stop())
})
