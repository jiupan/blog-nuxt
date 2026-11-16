import { readAccountSession, revokeAccountSession, type AccountCookie } from '../services/security/account-session.service'
import { accountMailAvailable } from '../services/users/account-email.service'
import { publicProfile } from '../services/users/public-profile'

export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    session.emailAvailable = accountMailAvailable(event)
    const account = await readAccountSession(event, session as AccountCookie)
    if (account?.status === 'ACTIVE') {
      const { id, username, role } = account
      session.user = { id, username, role, ...publicProfile(account) }
    } else {
      delete session.user
    }
  })
  sessionHooks.hook('clear', async (session) => {
    const id = (session as AccountCookie).secure?.accountSessionId
    if (id) await revokeAccountSession(id)
  })
})
