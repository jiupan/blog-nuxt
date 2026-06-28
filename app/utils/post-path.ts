export function postPath(slug: string) {
  const cleanSlug = slug.replace(/\.html$/i, '')
  return `/${cleanSlug}.html`
}
