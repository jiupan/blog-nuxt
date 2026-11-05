// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import PostCoverImage from '../app/components/PostCoverImage.vue'
import ArchivePostCard from '../app/components/ArchivePostCard.vue'

let dispose: (() => void) | undefined
beforeEach(() => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(false)
})
afterEach(() => { dispose?.(); document.body.innerHTML = ''; vi.restoreAllMocks() })

it('keeps an actual image in SSR HTML for browsers without JavaScript', async () => {
  const html = await renderToString(createApp(PostCoverImage, { src: '/cover.webp', alt: '封面' }))
  expect(html).toContain('src="/cover.webp"')
  expect(html).toContain('loading="lazy"')
  expect(html).not.toContain('is-pending')
})

it('shows only the image placeholder until load, including when a cover URL changes', async () => {
  const src = ref('/first.webp')
  const loaded = vi.fn()
  const host = document.createElement('div')
  const app = createApp({ render: () => h(PostCoverImage, { src: src.value, alt: '封面', onLoad: loaded }) })
  app.mount(host)
  dispose = () => app.unmount()
  await nextTick()
  const image = host.querySelector('img')!
  expect(image.classList.contains('is-pending')).toBe(true)
  image.dispatchEvent(new Event('load'))
  await nextTick()
  expect(image.classList.contains('is-pending')).toBe(false)
  expect(loaded).toHaveBeenCalledOnce()
  src.value = '/second.webp'
  await nextTick(); await nextTick()
  expect(image.classList.contains('is-pending')).toBe(true)
  expect(image.getAttribute('src')).toBe('/second.webp')
})

it('recognizes cached covers even when the load event already fired', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800)
  const loaded = vi.fn()
  const host = document.createElement('div')
  const app = createApp(PostCoverImage, { src: '/cached.webp', alt: '封面', onLoad: loaded })
  app.mount(host)
  dispose = () => app.unmount()
  await nextTick()
  expect(host.querySelector('.is-pending')).toBeNull()
  expect(loaded).toHaveBeenCalledOnce()
})

it('keeps the title and summary usable while a cover loads or fails', async () => {
  const host = document.createElement('div')
  const app = createApp(ArchivePostCard, { post: { id: 1, slug: 'demo', title: '可读的标题', summary: '完整的摘要', cover: '/cover.webp' } })
  app.component('NuxtLink', defineComponent({ props: { to: String }, setup: (props, { slots }) => () => h('a', { href: props.to }, slots.default?.()) }))
  app.mount(host)
  dispose = () => app.unmount()
  await nextTick()
  expect(host.querySelector('h2 a')?.textContent).toBe('可读的标题')
  expect(host.textContent).toContain('完整的摘要')
  expect(host.querySelector('[inert], .card-placeholder')).toBeNull()
  host.querySelector('img')!.dispatchEvent(new Event('error'))
  await nextTick()
  expect(host.querySelector('img')).toBeNull()
  expect(host.querySelector('.archive-thumb')).not.toBeNull()
  expect(host.querySelector('.is-loading')).toBeNull()
  expect(host.querySelector('h2 a')?.getAttribute('href')).toContain('demo')
})
