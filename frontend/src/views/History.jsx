import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, tn } from '../lib/i18n.js'
import { WorkoutRow, DayNoteRow, workoutDetailSheet, logPastWorkoutSheet } from '../sheets.jsx'
import { Button, Segmented, SelectRow } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { dayNoteOf } from '../lib/day-notes.js'
import { todayISO } from '../lib/format.js'
import { workoutDay } from '../lib/history.js'
import { isInSessionMonth } from '../lib/session-stats-period.js'
import { reportSheet } from '../components/ReportSheet.jsx'
import { recoverySessionsOf } from '../lib/recovery-sessions.js'
import { recoverySheet, RecoveryRow } from '../components/RecoverySheet.jsx'
import { activitiesOf, SPORTS, SPORT_LABEL } from '../lib/activities.js'
import { activitySheet, ActivityRow } from '../components/ActivitySheet.jsx'

// Newest first: every workout, and in between them the days off you left a note on (#261) and the
// recovery sessions (sauna, ice bath, lib/recovery-sessions.js). A note on a day that has a workout
// too stays in the day sheet; the workout speaks for that day. A recovery session is always its own row,
// and so is an activity (a run, a match: lib/activities.js).
export function historyRows(S) {
  const workouts = (S.workouts || []).map(w => ({ d: workoutDay(w) || '', w }))
  const trained = new Set(workouts.map(r => r.d))
  const notes = Object.keys(S.dayNotes || {}).filter(d => !trained.has(d)).map(d => ({ d, note: dayNoteOf(S, d) })).filter(x => x.note)
  const rows = [...workouts, ...notes, ...recoverySessionsOf(S).map(r => ({ d: r.d, rec: r })), ...activitiesOf(S).map(a => ({ d: a.d, act: a }))]
  // Stable, so workouts keep the order they are stored in (by day, then start) within a day.
  return rows.map((r, i) => [r, i]).sort((a, b) => (a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : b[1] - a[1])).map(([r]) => r)
}

// The list grows as it is scrolled: the first PAGE rows, then PAGE more whenever its end comes
// within a screen or so. A 400-workout history rendered every row (some 1500 components) on each
// open. How far it had grown is kept for the session, so coming back (the back button, the edge
// swipe) renders the same rows and the page lands where it was scrolled to.
export const HISTORY_PAGE = 60
let grownTo = HISTORY_PAGE

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const all = historyRows(S)
  const [params] = useSearchParams()
  const [filter, setFilter] = useState(() => params.get('filter') === 'strength' ? 'strength' : 'all')
  const [period, setPeriod] = useState(() => params.get('period') === 'month' ? 'month' : 'all')
  const [sport, setSport] = useState('')
  const today = todayISO()
  const inPeriod = period === 'month' ? all.filter(r => isInSessionMonth(r.d, today)) : all
  const workoutTotal = inPeriod.filter(r => r.w).length
  const sportTotal = inPeriod.filter(r => r.act).length
  const rows = filter === 'all' ? inPeriod
    : filter === 'strength' ? inPeriod.filter(r => r.w)
      : inPeriod.filter(r => r.act && (!sport || r.act.sport === sport))
  const [shown, setShown] = useState(() => Math.max(HISTORY_PAGE, grownTo))
  const end = useRef(null)
  const more = rows.length > shown
  useEffect(() => { grownTo = Math.max(grownTo, shown) }, [shown])
  useEffect(() => {
    if (!more) return
    const IO = typeof window !== 'undefined' ? window.IntersectionObserver : undefined
    // Without an observer (an old engine) the list is simply whole, as before.
    if (typeof IO !== 'function') { setShown(Infinity); return }
    const io = new IO(es => { if (es.some(e => e.isIntersecting)) setShown(n => n + HISTORY_PAGE) }, { rootMargin: '0px 0px 1200px 0px' })
    if (end.current) io.observe(end.current)
    return () => io.disconnect()
  }, [more, shown])
  return <>
    <div className="hdr"><button className="iconbtn" data-back="/stats" data-tour="history-back" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('History')}</h1><div className="sub">
        {tn('{0} workout', '{0} workouts', workoutTotal)}
        {(filter !== 'strength' || period !== 'month') && <> {'·'} {tn('{0} sport session total', '{0} sport sessions total', sportTotal)}</>}
      </div></div>
      {/* A sauna, an ice bath (components/RecoverySheet.jsx): logged from here, listed below with the workouts. */}
      {all.length > 0 && <button className="iconbtn" onClick={() => recoverySheet()} aria-label={t('Log recovery')} title={t('Log recovery')} style={{ marginInlineEnd: 8 }}><Icon name="sparkles" /></button>}
      {S.workouts.length > 0 && <button className="iconbtn" onClick={reportSheet} aria-label={t('Performance report')} title={t('Performance report')}><Icon name="note" /></button>}</div>
    <div className="history-log-actions">
      <Button icon="plus" data-tour="history-add" onClick={logPastWorkoutSheet}>{t('Log a past workout')}</Button>
      <Button icon="plus" onClick={() => activitySheet()}>{t('Log an activity')}</Button>
    </div>
    {all.length > 0 && <Segmented className="history-filter" of={t('History')} value={filter} onChange={setFilter}
      options={[
        { value: 'all', label: t('All') },
        { value: 'strength', label: t('Strength training') },
        { value: 'sport', label: t('Sport') },
      ]} />}
    {(filter === 'strength' || period === 'month') && <SelectRow title={t('Period')} value={period} onChange={setPeriod}
      options={[{ value: 'all', label: t('All dates') }, { value: 'month', label: t('This month') }]} />}
    {filter === 'sport' && <SelectRow title={t('Sport')} value={sport} onChange={setSport}
      options={[{ value: '', label: t('All sports') }, ...SPORTS.map(s => ({ value: s, label: t(SPORT_LABEL[s]) }))]} />}
    {rows.length ? <><div className="list">{(more ? rows.slice(0, shown) : rows).map((r, i) => r.w
      ? <WorkoutRow key={r.w.id} w={r.w} tour={i === 0 ? 'history-row' : undefined} onClick={() => workoutDetailSheet(r.w)} />
      : r.rec ? <RecoveryRow key={'rec-' + r.rec.id} r={r.rec} />
      : r.act ? <ActivityRow key={'act-' + r.act.id} a={r.act} />
      : <DayNoteRow key={'note-' + r.d} iso={r.d} note={r.note} />)}</div>
      {more && <div ref={end} aria-hidden="true" style={{ height: 1 }} />}</>
      : <EmptyState icon="history" text={t('No records in this view')}>
        {!all.length && <Button variant="ghost" icon="sparkles" onClick={() => recoverySheet()}>{t('Log recovery')}</Button>}
      </EmptyState>}
  </>
}
