import { activitiesOf, activityTotals } from './activities.js'
import { isoOf, weekKey } from './format.js'
import { sessionStatsRange } from './session-stats-period.js'

const previousWeek = key => {
  const day = new Date(key + 'T12:00:00')
  day.setDate(day.getDate() - 7)
  return isoOf(day)
}

/** Consecutive weeks with at least one saved activity. The current week stays open until it ends. */
export function sportProgress(activities, today, weekStart, sport = '') {
  const thisWeek = weekKey(today, weekStart)
  const weeks = new Set()
  let total = 0
  let weekly = 0
  for (const a of activities) {
    if (a.d > today || (sport && a.sport !== sport)) continue
    const key = weekKey(a.d, weekStart)
    if (key > thisWeek) continue
    weeks.add(key)
    total++
    if (key === thisWeek) weekly++
  }

  let currentWeek = weeks.has(thisWeek) ? thisWeek : previousWeek(thisWeek)
  let previous = null
  let run = 0
  let best = 0
  let current = 0
  for (const key of [...weeks].sort().reverse()) {
    run = key === previous ? run + 1 : 1
    best = Math.max(best, run)
    previous = previousWeek(key)
    if (key === currentWeek) {
      current++
      currentWeek = previous
    }
  }
  return { total, weekly, current, best }
}

export function sportStatistics(S, { period, today, from, to, sport, weekStart }) {
  const saved = activitiesOf(S)
  const oldest = saved[saved.length - 1]?.d
  const window = sessionStatsRange({ period, today, from, to, oldest, weekStart })
  const totals = activityTotals(S, window.from, window.to)
  const history = saved.filter(a => a.d >= window.from && a.d <= window.to && (!sport || a.sport === sport))
  const selected = sport ? totals.sports.find(s => s.sport === sport) : totals
  const days = sport ? new Set(history.map(a => a.d)).size : totals.days
  return { ...window, n: selected?.n ?? 0, min: selected?.min ?? 0, days, sports: totals.sports, history }
}

/** Consecutive calendar weeks or months, including periods with no saved sessions. */
export function sportTrend({ from, to, history }, grouping, weekStart) {
  const weekly = grouping === 'week'
  const bucketKey = d => weekly ? weekKey(d, weekStart) : d.slice(0, 7) + '-01'
  const counts = new Map()
  for (const a of history) {
    const key = bucketKey(a.d)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const buckets = []
  const start = new Date(bucketKey(from) + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (start <= end) {
    const key = isoOf(start)
    if (weekly) start.setDate(start.getDate() + 7)
    else start.setMonth(start.getMonth() + 1)
    const last = new Date(start)
    last.setDate(last.getDate() - 1)
    const lastDay = isoOf(last)
    buckets.push({ key, from: key < from ? from : key, to: lastDay > to ? to : lastDay, n: counts.get(key) || 0 })
  }
  return buckets
}
