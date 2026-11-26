import { describe, expect, it } from 'vitest'
import { sportProgress, sportStatistics, sportTrend } from './sport-statistics.js'
import { activitiesOf } from './activities.js'

const today = '2026-03-04'
const S = {
  activities: {
    early: { d: '2025-12-31', sport: 'fight', min: 40 },
    one: { d: '2026-02-28', sport: 'fight', min: 30 },
    two: { d: '2026-03-01', sport: 'fight', min: 20, at: 2 },
    three: { d: '2026-03-01', sport: 'fight', min: 45, at: 1 },
    four: { d: '2026-03-01', sport: 'ride', min: 90, src: 'import' },
    five: { d: today, sport: 'run', min: 25, src: 'ah' },
    removed: { _ts: 42 },
    future: { d: '2026-03-05', sport: 'fight', min: 60 },
  },
  workouts: [{ id: 'lifts', d: today }],
  routines: [{ id: 'planned', name: 'Boxing', d: today }],
  week: { 3: 'planned' },
}
const summary = (period, opts = {}) => sportStatistics(S, { period, today, weekStart: 1, ...opts })

describe('sport streaks', () => {
  const activities = activitiesOf(S)
  it('counts sessions independently of lifting and keeps the current week open', () => {
    expect(sportProgress(activities, '2026-03-04', 1)).toEqual({ total: 6, weekly: 1, current: 2, best: 2 })
    expect(sportProgress(activities, '2026-03-04', 1, 'fight')).toEqual({ total: 4, weekly: 0, current: 1, best: 1 })
    expect(sportProgress(activities, '2026-03-18', 1)).toEqual({ total: 7, weekly: 0, current: 0, best: 2 })
  })
  it('uses the selected first day of the week and counts at most one streak week per week', () => {
    expect(sportProgress(activities, '2026-03-04', 0, 'fight')).toEqual({ total: 4, weekly: 2, current: 2, best: 2 })
    expect(sportProgress(activities, '2026-03-04', 0, 'swim')).toEqual({ total: 0, weekly: 0, current: 0, best: 0 })
  })
})

describe('sport statistics', () => {
  it('counts saved sessions and unique days across sports, leaving plans, lifts and removed records out', () => {
    const all = summary('all')
    expect(all).toMatchObject({ from: '2025-12-31', to: today, n: 6, min: 250, days: 4 })
    expect(all.sports.map(({ sport, n, min }) => [sport, n, min])).toEqual([
      ['fight', 4, 135], ['ride', 1, 90], ['run', 1, 25],
    ])
    expect(summary('all', { sport: 'swim' })).toMatchObject({ n: 0, min: 0, days: 0, history: [] })
  })

  it('uses local calendar presets, including the profile’s first weekday', () => {
    expect(summary('week')).toMatchObject({ from: '2026-03-02', n: 1 })
    expect(summary('week', { weekStart: 0 })).toMatchObject({ from: '2026-03-01', n: 4 })
    expect(summary('month')).toMatchObject({ from: '2026-03-01', n: 4 })
    expect(summary('year')).toMatchObject({ from: '2026-01-01', n: 5 })
  })

  it('includes both custom endpoints and keeps the selected sport history in log order', () => {
    const custom = summary('custom', { from: '2026-02-28', to: '2026-03-01', sport: 'fight' })
    expect(custom).toMatchObject({ n: 3, min: 95, days: 2 })
    expect(custom.history.map(a => a.id)).toEqual(['two', 'three', 'one'])
    expect(summary('custom', { from: today, to: today })).toMatchObject({ n: 1, days: 1 })
  })

  it('groups counts chronologically, including zero months and clipped weeks', () => {
    const monthly = sportTrend(summary('all', { sport: 'fight' }), 'month', 1)
    expect(monthly.map(b => [b.key, b.n])).toEqual([
      ['2025-12-01', 1], ['2026-01-01', 0], ['2026-02-01', 1], ['2026-03-01', 2],
    ])
    const weekly = sportTrend(summary('custom', { from: '2026-02-28', to: today }), 'week', 0)
    expect(weekly).toEqual([
      { key: '2026-02-22', from: '2026-02-28', to: '2026-02-28', n: 1 },
      { key: '2026-03-01', from: '2026-03-01', to: today, n: 4 },
    ])
  })
})
