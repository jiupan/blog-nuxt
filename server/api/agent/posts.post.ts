import { readValidatedBody, setResponseStatus } from 'h3'
import { requireAgentToken } from '../../services/agent/agent-key.service'
import { agentPostSchema } from '../../services/agent/agent.schema'
import { publishAgentPost } from '../../services/agent/agent-publication.service'
import { ok } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const { keyId } = await requireAgentToken(event)
  const input = await readValidatedBody(event, agentPostSchema.parse)
  const result = await publishAgentPost(keyId, input)
  const origin = (
    process.env.NUXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    useRuntimeConfig(event).public.siteUrl
  ).replace(/\/$/, '')
  setResponseStatus(event, result.replayed ? 200 : 201)
  return ok(
    {
      ...result,
      post: {
        ...result.post,
        url: result.post.path ? `${origin}${result.post.path}` : null,
        editUrl: `${origin}${result.post.editPath}`
      }
    },
    result.replayed ? '该请求已处理，返回已有文章' : '文章已创建'
  )
})
