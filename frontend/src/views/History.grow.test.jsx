// @vitest-environment happy-dom
// History renders its rows a page at a time as the list is scrolled (performance round 2): a
// 400-workout history used to render every row on each open. Coming back renders as many rows as
// before, so the page can land where it was scrolled to.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
let DEF, useStore

const clone = v => JSON.parse(JSON.stringify(v))
let observers = []
class FakeIO {
  constructor(cb) { this.cb = cb; this.els = []; observers.push(this) }
  observe(el) { this.els.push(el) }
  disconnect() { this.els = []; observers = observers.filter(o => o !== this) }
}
// The end of the list comes into reach: every live observer is told.
const reachEnd = () => act(() => { for (const o of [...observers]) o.cb(o.els.map(target => ({ target, isIntersecting: true }))) })

const day = i => new Date(Date.UTC(2025, 0, 1) + i * 864e5).toISOString().slice(0, 10)
function install(n) {
  const st = clone(DEF)
  const workouts = Array.from({ length: n }, (_, i) => ({ id: 'w' + i, d: day(i), start: Date.parse(day(i) + 'T10:00:00Z'), end: Date.parse(day(i) + 'T11:00:00Z'), name: 'Push ' + i, entries: [], prs: [] }))
  Object.assign(st, { routines: [], week: {}, dayPlan: {}, active: null, workouts, weighIn: false })
  useStore.setState({ S: st, user: null })
}

const roots = []
function mount(History, path = '/history') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  roots.push(root)
  act(() => root.render(<MemoryRouter initialEntries={[path]}><History /></MemoryRouter>))
  return host
}
const rows = host => host.querySelectorAll('.list .item').length

describe('History grows as it is scrolled', () => {
  let History, PAGE
  beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.resetModules()
    observers = []
    window.IntersectionObserver = FakeIO
    ;({ DEF, useStore } = await import('../store/useStore.js'))
    ;({ default: History, HISTORY_PAGE: PAGE } = await import('./History.jsx'))
  })
  afterEach(() => {
    for (const r of roots.splice(0)) act(() => r.unmount())
    document.body.innerHTML = ''
    delete window.IntersectionObserver
    vi.useRealTimers()
  })

  it('renders the first page, then a page more each time its end comes into reach, newest first', async () => {
    install(150)
    const host = mount(History)
    expect(rows(host)).toBe(PAGE)
    expect(host.querySelector('.list .item .tt').textContent).toBe('Push 149')
    reachEnd()
    expect(rows(host)).toBe(2 * PAGE)
    reachEnd()
    expect(rows(host)).toBe(150)
    // all there: nothing left to observe
    expect(observers).toHaveLength(0)
    expect(host.querySelector('.list .item:last-child .tt').textContent).toBe('Push 0')
  })

  it('coming back renders as many rows as before (so the scroll position can be restored)', async () => {
    install(300)
    let host = mount(History)
    reachEnd(); reachEnd()
    expect(rows(host)).toBe(3 * PAGE)
    act(() => roots.pop().unmount())
    host = mount(History)
    expect(rows(host)).toBe(3 * PAGE)
  })

  it('a short history is whole, with nothing observed', async () => {
    install(12)
    const host = mount(History)
    expect(rows(host)).toBe(12)
    expect(observers).toHaveLength(0)
  })

  it('opens from Stats with the current month and strength training selected', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2025, 1, 2, 12))
    install(34)
    useStore.setState(({ S }) => ({
      S: {
        ...S,
        workouts: S.workouts.map((w, i) => i === 31 ? { ...w, d: undefined, start: new Date(2025, 1, 1, 12).getTime() } : w),
        activities: { ride: { d: '2025-02-01', sport: 'ride', min: 25 } },
        recoverySessions: { massage: { d: '2025-02-02', kind: 'massage', min: 20 } },
      },
    }))
    const host = mount(History, '/history?filter=strength&period=month')
    expect([...host.querySelectorAll('.list .item .tt')].map(el => el.textContent)).toEqual(['Push 32', 'Push 31'])
    expect(host.querySelector('.hdr .sub').textContent.trim()).toBe('2 workouts')
    const period = [...host.querySelectorAll('button.lrow')].find(b => b.querySelector('.lrow-t')?.textContent === 'Period')
    expect(period.querySelector('.lrow-v').textContent).toBe('This month')
    expect(host.querySelector('.list').textContent).not.toContain('Invalid Date')
  })

  it('shows sport totals and filters history down to a selected sport', async () => {
    install(1)
    useStore.setState(({ S }) => ({ S: { ...S, activities: {
      boxing: { d: day(1), sport: 'fight', min: 45 },
      cycling: { d: day(2), sport: 'ride', min: 30 },
    } } }))
    const host = mount(History)
    expect(host.querySelector('.hdr .sub').textContent).toContain('2 sport sessions total')
    const sportTab = [...host.querySelectorAll('.history-filter button')].find(b => b.textContent === 'Sport')
    act(() => sportTab.click())
    expect(rows(host)).toBe(2)
    expect(host.querySelector('[data-activity="boxing"]')).toBeTruthy()

    const [{ useUI }, { bindUI }] = await Promise.all([
      import('../store/useUI.js'),
      import('../components/ui.jsx'),
    ])
    bindUI(useUI)
    const sportPicker = [...host.querySelectorAll('button.lrow')].find(b => b.textContent.includes('All sports'))
    act(() => sportPicker.click())
    const sheet = useUI.getState().sheets.at(-1)
    const picker = document.createElement('div')
    host.appendChild(picker)
    const root = createRoot(picker)
    roots.push(root)
    act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
    const boxing = [...picker.querySelectorAll('button')].find(b => b.textContent === 'Boxing & martial arts')
    act(() => boxing.click())
    expect(rows(host)).toBe(1)
    expect(host.querySelector('[data-activity="boxing"]')).toBeTruthy()
  })

  it('without IntersectionObserver the whole list renders, as before', async () => {
    delete window.IntersectionObserver
    install(150)
    const host = mount(History)
    expect(rows(host)).toBe(150)
  })
})
