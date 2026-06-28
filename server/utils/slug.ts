export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizePostSlug(value: string) {
  return safeDecode(value)
    .trim()
    .toLowerCase()
    .replace(/\.html$/i, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createRandomPostSlug(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const random = globalThis.crypto?.getRandomValues(new Uint8Array(length))

  if (random) {
    return Array.from(random, (value) => alphabet[value % alphabet.length]).join('')
  }

  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
