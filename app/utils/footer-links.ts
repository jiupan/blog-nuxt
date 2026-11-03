export function isPublicFooterLink(to: string) {
  if (!to) return true
  try {
    const { pathname } = new URL(to, 'https://footer.invalid')
    return !/^\/admin(?:\/|$)/i.test(pathname)
  } catch {
    return false
  }
}

export function parseFooterBottomLinks(value: string) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, to] = line.split('|').map(part => part?.trim())
      return { label: label || '', to: to || '/' }
    })
    .filter(link => link.label && isPublicFooterLink(link.to))
}
