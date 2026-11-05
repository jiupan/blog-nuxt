// @vitest-environment happy-dom
import { createApp, defineComponent, h } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import SeoPagination from '../app/components/SeoPagination.vue'

let dispose: (() => void) | undefined
afterEach(() => { dispose?.(); document.body.innerHTML = ''; vi.restoreAllMocks() })

function mount() {
  const main = document.createElement('main')
  document.body.append(main)
  vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 400 } as DOMRect)
  const order: string[] = []
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => { order.push('scroll') })
  const app = createApp(SeoPagination, { page: 1, total: 3, pageTo: (page: number) => `/?page=${page}` })
  app.component('NuxtLink', defineComponent({
    props: { to: String },
    setup(props, { slots }) { return () => h('a', { href: props.to, onClick: (e: MouseEvent) => { e.preventDefault(); order.push('navigation') } }, slots.default?.()) }
  }))
  app.component('UIcon', defineComponent({ render: () => h('span') }))
  app.mount(main)
  dispose = () => app.unmount()
  return { main, scroll, order, second: main.querySelector<HTMLAnchorElement>('a[data-page="2"]')! }
}

it('positions at the list before navigation starts, using instant scroll despite global smooth CSS', () => {
  const { main, scroll, order, second } = mount()
  second.click()
  expect(scroll).toHaveBeenCalledWith({ top: 304, behavior: 'instant' })
  expect(order).toEqual(['scroll', 'navigation'])
  expect(document.activeElement).toBe(main)
})

it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])('does not move the current page when opening a link separately: %j', modifiers => {
  const { second, scroll } = mount()
  second.dispatchEvent(new MouseEvent('click', { bubbles: true, ...modifiers }))
  expect(scroll).not.toHaveBeenCalled()
  expect(second.getAttribute('href')).toBe('/?page=2')
})

it('does not scroll when the current page number is clicked', () => {
  const { main, scroll } = mount()
  main.querySelector<HTMLAnchorElement>('a[data-page="1"]')!.click()
  expect(scroll).not.toHaveBeenCalled()
})
