import { getRequestURL } from 'h3'
import { assertSameOrigin } from '../utils/origin'

export default defineEventHandler((event) => {
  const encodedPath = getRequestURL(event).pathname
  const path = encodedPath.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
  if (/^\/(?:account|login|register)(?:\/|$)/.test(path)) setResponseHeader(event, 'Cache-Control', 'private, no-store')
  if (/^\/api\/(?:auth|_auth|admin\/users|resumes)(?:\/|$)/.test(path) || /^\/api\/posts\/[^/]+\/chat(?:\/|$)/.test(path)) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    assertSameOrigin(event)
  }
})
