import { closePdfBrowser } from '~~/server/services/resume-export/pdf-browser.service'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', closePdfBrowser)
})
