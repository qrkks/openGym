import { weekKey } from './format.js'

export function sessionStatsRange({ period, today, from, to, oldest, weekStart }) {
  if (period === 'custom') return { from, to }
  const starts = {
    all: oldest && oldest < today ? oldest : today,
    week: weekKey(today, weekStart),
    month: today.slice(0, 7) + '-01',
    year: today.slice(0, 4) + '-01-01',
  }
  return { from: starts[period], to: today }
}

export const isInSessionMonth = (day, today) => !!day && day.slice(0, 7) === today.slice(0, 7) && day <= today
