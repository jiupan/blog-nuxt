import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { rateLimited } from '~~/server/utils/api-error'

type PdfBrowserState = {
  browserPromise?: Promise<Browser>
  activeJobs: number
  waiters: Array<() => void>
}

const globalForPdfBrowser = globalThis as typeof globalThis & {
  __resumePdfBrowser?: PdfBrowserState
}

const state = globalForPdfBrowser.__resumePdfBrowser ?? {
  activeJobs: 0,
  waiters: []
}

globalForPdfBrowser.__resumePdfBrowser = state

async function getBrowser() {
  if (!state.browserPromise) {
    state.browserPromise = chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    })

    state.browserPromise.then((browser) => {
      browser.on('disconnected', () => {
        state.browserPromise = undefined
      })
    }).catch(() => {
      state.browserPromise = undefined
    })
  }

  return state.browserPromise
}

async function acquireSlot() {
  if (state.activeJobs >= 2) {
    if (state.waiters.length >= 8) {
      throw rateLimited('PDF 导出任务繁忙，请稍后重试')
    }
    await new Promise<void>((resolve) => state.waiters.push(resolve))
  }
  state.activeJobs += 1
}

function releaseSlot() {
  state.activeJobs = Math.max(0, state.activeJobs - 1)
  state.waiters.shift()?.()
}

export async function withPdfPage<T>(task: (page: Page) => Promise<T>) {
  await acquireSlot()
  let page: Page | undefined

  try {
    const browser = await getBrowser()
    page = await browser.newPage()
    return await task(page)
  } finally {
    await page?.close().catch(() => undefined)
    releaseSlot()
  }
}

export async function closePdfBrowser() {
  const browserPromise = state.browserPromise
  state.browserPromise = undefined
  if (!browserPromise) return
  const browser = await browserPromise.catch(() => null)
  await browser?.close().catch(() => undefined)
}
