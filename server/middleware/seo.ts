export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (/^\/(admin|login|register|resume-print|api)(\/|$)/.test(path)) {
    setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  }
})
