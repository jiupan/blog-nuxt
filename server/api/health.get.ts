import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' }
  } catch {
    setResponseStatus(event, 503)
    return { status: 'unavailable' }
  }
})
