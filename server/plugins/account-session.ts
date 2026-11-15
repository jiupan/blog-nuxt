import { readAccountSession, revokeAccountSession, type AccountCookie } from '../services/security/account-session.service'

export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    const account = await readAccountSession(event, session as AccountCookie)
    if (account?.status === 'ACTIVE') {
      const { id, username, email, role } = account
      session.user = { id, username, email, role }
    } else {
      delete session.user
    }
  })
  sessionHooks.hook('clear', async (session) => {
    const id = (session as AccountCookie).secure?.accountSessionId
    if (id) await revokeAccountSession(id)
  })
})
