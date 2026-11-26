import { SPORTS } from './activities.js'

const planKey = (day, sport) => day + ':' + sport

export function sportsOnWeekday(S, day) {
  return SPORTS.filter(sport => S.sportPlan?.[planKey(day, sport)]?.on === true)
}

export function withPlannedSport(plan, day, sport, on, now = Date.now()) {
  const key = planKey(day, sport)
  const _ts = Math.max(now, (Number(plan?.[key]?._ts) || 0) + 1)
  // A cleared entry still needs a timestamp so another device can see the removal.
  return { ...plan, [key]: on ? { on: true, _ts } : { _ts } }
}
