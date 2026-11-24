// @vitest-environment happy-dom
import { createApp, defineComponent, h } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import SeoPagination from '../app/components/SeoPagination.vue'

let dispose: (() => void) | undefined
afterEach(() => { dispose?.(); document.body.innerHTML = ''; vi.restoreAllMocks() })

function mount(page = 1, total = 3) {
  const main = document.createElement('main')
  document.body.append(main)
  vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ top: 400 } as DOMRect)
  const order: string[] = []
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => { order.push('scroll') })
  const app = createApp(SeoPagination, { page, total, pageTo: (page: number) => `/?page=${page}` })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] })
  app.use(router)
  const push = vi.spyOn(router, 'push').mockImplementation(async () => { order.push('jump') })
  app.component('NuxtLink', defineComponent({
    props: { to: String },
    setup(props, { slots }) { return () => h('a', { href: props.to, onClick: (e: MouseEvent) => { e.preventDefault(); order.push('navigation') } }, slots.default?.()) }
  }))
  app.component('UIcon', defineComponent({ render: () => h('span') }))
  app.mount(main)
  dispose = () => app.unmount()
  return { main, scroll, order, push, second: main.querySelector<HTMLAnchorElement>('a[data-page="2"]')! }
}

it('positions at the page top before navigation starts, using instant scroll despite global smooth CSS', () => {
  const { main, scroll, order, second } = mount()
  second.click()
  expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
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
  const currentPage = main.querySelector<HTMLElement>('[aria-current="page"]')!
  expect(currentPage.tagName).toBe('SPAN')
  currentPage.click()
  expect(scroll).not.toHaveBeenCalled()
})

it('shows two neighboring pages in each direction and keeps the first and last page links', () => {
  const { main } = mount(20, 50)
  expect([...main.querySelectorAll('.page-number, .page-ellipsis')].map(item => item.textContent)).toEqual([
    '1', '…', '18', '19', '20', '21', '22', '…', '50'
  ])
  expect(main.querySelector('[rel="prev"]')?.getAttribute('href')).toBe('/?page=19')
  expect(main.querySelector('[rel="next"]')?.getAttribute('href')).toBe('/?page=21')
})

it('caps the input at the last page and scrolls before jumping there', () => {
  const { main, scroll, order, push } = mount(1, 6)
  const input = main.querySelector('input')!
  const form = main.querySelector('form')!
  const fill = (value: string) => {
    input.value = value
    input.dispatchEvent(new Event('input'))
  }
  const submit = () => {
    form.dispatchEvent(new Event('submit', { cancelable: true }))
  }

  fill('0')
  submit()
  expect(input.validationMessage).toContain('1 到 6')
  expect(push).not.toHaveBeenCalled()
  expect(scroll).not.toHaveBeenCalled()

  fill('7')
  expect(input.value).toBe('6')
  fill('69')
  expect(input.value).toBe('6')
  expect(input.validationMessage).toBe('')
  expect(push).not.toHaveBeenCalled()
  submit()
  expect(push).toHaveBeenCalledWith('/?page=6')
  expect(order).toEqual(['scroll', 'jump'])
})
