import { RECOVERY_KINDS } from './recovery-sessions.js'
import { sessionStatsRange } from './session-stats-period.js'

export function recoveryStatistics(saved, { period, today, from, to, kind, weekStart }) {
  const oldest = saved.at(-1)?.d
  const range = sessionStatsRange({ period, today, from, to, oldest, weekStart })
  const history = []
  const days = new Set()
  const byKind = Object.fromEntries(RECOVERY_KINDS.map(kind => [kind, { kind, n: 0, min: 0 }]))
  let min = 0
  for (const session of saved) {
    if (session.d < range.from || session.d > range.to) continue
    const item = byKind[session.kind]
    item.n++
    item.min += session.min
    if (kind && session.kind !== kind) continue
    history.push(session)
    days.add(session.d)
    min += session.min
  }
  return { ...range, n: history.length, min, days: days.size, kinds: Object.values(byKind).filter(k => k.n > 0), history }
}
