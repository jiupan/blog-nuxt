import { requireUser } from '~~/server/utils/auth'
import { saveResumeSchema } from '~~/server/services/resumes/resume.schema'
import {
  createResumeExportToken,
  deleteResumeExportToken
} from '~~/server/services/resume-export/resume-export-token.service'
import { withPdfPage } from '~~/server/services/resume-export/pdf-browser.service'

function safePdfFileName(title: string) {
  const normalized = title.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
  return normalized || 'resume'
}

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const resume = saveResumeSchema.parse(await readBody(event))
  const port = process.env.PORT || '3000'

  const pdf = await withPdfPage(async (page) => {
    const token = createResumeExportToken(resume)
    const printUrl = `http://127.0.0.1:${port}/resume-print/${token}`

    try {
      await page.goto(printUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
      })
      await page.locator('.resume-paper').waitFor({
        state: 'visible',
        timeout: 15_000
      })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))

      return page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        preferCSSPageSize: true
      })
    } finally {
      deleteResumeExportToken(token)
    }
  })

  const fileName = safePdfFileName(resume.title)
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}.pdf`,
    'Cache-Control': 'private, no-store'
  })
  return pdf
})
