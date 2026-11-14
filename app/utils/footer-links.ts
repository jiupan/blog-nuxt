export function isPublicFooterLink(to: string) {
  if (!to) return true
  try {
    const { pathname } = new URL(to, 'https://footer.invalid')
    return !/^\/admin(?:\/|$)/i.test(pathname)
  } catch {
    return false
  }
}

export function parseFooterBottomLinks(value: string, { includeHidden = false } = {}) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, to] = line.split('|').map(part => part?.trim())
      return { label: label || '', to: to || '/' }
    })
    .filter(link => link.label && (includeHidden || isPublicFooterLink(link.to)))
}

export function mergeFooterArchiveLinks<T extends { to: string }>(links: T[]) {
  const archiveLink = links.find(link => /^\/archive\/?$/.test(link.to))
    ?? links.find(link => /^\/posts\/?$/.test(link.to))
  return links.flatMap((link) => {
    if (link === archiveLink) return [{ ...link, to: '/archive' }]
    return /^\/(posts|archive)\/?$/.test(link.to) ? [] : [{ ...link, to: publicArchivePath(link.to) }]
  })
}

export function publicArchivePath(path: string) {
  return path.replace(/^\/posts\/?(?=[?#]|$)/, '/archive')
}
