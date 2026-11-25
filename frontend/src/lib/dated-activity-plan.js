import { SPORTS } from './activities.js'
import { RECOVERY_KINDS } from './recovery-sessions.js'
import { sportsOnWeekday } from './sport-plan.js'

const keyOf = (iso, type, kind) => iso + ':' + type + ':' + kind

export function datedActivitiesOn(S, iso, type) {
  const kinds = type === 'sport' ? SPORTS : RECOVERY_KINDS
  return kinds.filter(kind => S.datedActivityPlan?.[keyOf(iso, type, kind)]?.on === true)
}

export function plannedSportsOn(S, iso, weekday = new Date(iso + 'T12:00:00').getDay()) {
  return [...new Set([...sportsOnWeekday(S, weekday), ...datedActivitiesOn(S, iso, 'sport')])]
}

export function withDatedActivity(plan, iso, type, kind, on, now = Date.now()) {
  const key = keyOf(iso, type, kind)
  const _ts = Math.max(now, (Number(plan?.[key]?._ts) || 0) + 1)
  return { ...plan, [key]: on ? { on: true, _ts } : { _ts } }
}
