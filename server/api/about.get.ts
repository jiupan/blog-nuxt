import { getSettingsMap } from '~~/server/services/settings/settings.service'
import { setCacheControl } from '~~/server/utils/cache-control'
import { ok } from '~~/server/utils/response'
import { emptyAboutProfile, parseAboutProfile } from '~~/shared/about-profile'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'no-store')
  const settings = await getSettingsMap(['about_profile'])
  const profile = parseAboutProfile(settings.about_profile)
  return ok(profile?.success ? profile.data : emptyAboutProfile)
})
