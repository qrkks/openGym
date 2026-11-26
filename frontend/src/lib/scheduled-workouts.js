/** A dated workout is an extra session alongside the regular schedule. */
export function scheduledWorkoutOf(S, iso) {
  const plan = S?.scheduledWorkouts?.[iso]
  return plan?.id && Array.isArray(plan.ex) && plan.ex.length ? plan : null
}

export const completedScheduledWorkout = (S, plan) =>
  plan && (S.workouts || []).find(w => w.scheduledWorkoutId === plan.id && w.entries?.length)

export function withScheduledWorkout(map, iso, plan, now = Date.now()) {
  const _ts = Math.max(now, (Number(map?.[iso]?._ts) || 0) + 1)
  return { ...map, [iso]: plan ? { ...plan, _ts } : { _ts } }
}
