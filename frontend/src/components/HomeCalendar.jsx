import { useMemo, useState } from 'react'
import { dateLocale, t } from '../lib/i18n.js'
import { DAYS, fmtDate, fmtDateRange, isoOf, startOfWeek, weekDayOffset, weekOrder, weekStartOf } from '../lib/format.js'
import { effectiveRoutineIds, workoutDay } from '../lib/history.js'
import { dayNoteOf } from '../lib/day-notes.js'
import { datedActivitiesOn, plannedSportsOn } from '../lib/dated-activity-plan.js'
import { recoveryDays } from '../lib/recovery-sessions.js'
import { scheduledWorkoutOf } from '../lib/scheduled-workouts.js'
import { Segmented } from './ui.jsx'
import Icon from './Icon.jsx'

const VIEW_KEY = 'gym_home_calendar_view'
const WORKOUT_MARK_LABEL = { done: 'Trained', noted: 'Day note', ovr: 'Rescheduled', plan: 'Planned' }

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week' }
  catch { return 'week' }
}

export default function HomeCalendar({ state, today, activities, onDay }) {
  const [view, setView] = useState(readView)
  const [anchorDate, setAnchorDate] = useState(null)
  const monthly = view === 'month'
  const anchor = new Date((anchorDate || today) + 'T12:00:00')
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const ws = weekStartOf(state)
  const first = monthly ? new Date(year, month, 1, 12) : startOfWeek(isoOf(anchor), ws)
  const days = monthly ? new Date(year, month + 1, 0, 12).getDate() : 7
  const dates = Array.from({ length: days }, (_, i) =>
    new Date(first.getFullYear(), first.getMonth(), first.getDate() + i, 12))
  const from = isoOf(first)
  const to = isoOf(dates.at(-1))
  const label = monthly ? anchor.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' })
    : from <= today && today <= to ? t('This week') : fmtDateRange(from, to, false, new Date(today + 'T12:00:00'))

  const doneDays = useMemo(() => new Set(state.workouts.map(workoutDay)), [state.workouts])
  const sportDays = useMemo(() => new Set(activities.map(a => a.d)), [activities])
  const recDays = useMemo(() => recoveryDays({ recoverySessions: state.recoverySessions }), [state.recoverySessions])
  const changeView = next => {
    setView(next)
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* still switches without storage */ }
  }
  const move = step => {
    const next = monthly ? new Date(year, month + step, 1, 12)
      : new Date(year, month, anchor.getDate() + 7 * step, 12)
    setAnchorDate(isoOf(next))
  }

  return <div className="home-calendar">
    <div className="home-calendar-controls">
      <div className="row between home-calendar-period">
        <button type="button" className="iconbtn" onClick={() => move(-1)}
          aria-label={t(monthly ? 'Previous month' : 'Previous week')}><Icon name="chevronLeft" /></button>
        <div className="small muted home-calendar-label" aria-live="polite">{label}</div>
        <button type="button" className="iconbtn" onClick={() => move(1)}
          aria-label={t(monthly ? 'Next month' : 'Next week')}><Icon name="chevronRight" /></button>
      </div>
      <Segmented className="seg-inline" value={view} onChange={changeView} options={[
        { value: 'week', label: t('Week view') },
        { value: 'month', label: t('Month view') },
      ]} />
    </div>
    <div className={'week' + (monthly ? ' home-month' : '')}>
      {monthly && weekOrder(ws).map(d => <span key={d} className="cal-h" aria-hidden="true">{t(DAYS[d])}</span>)}
      {monthly && Array.from({ length: weekDayOffset(first.getDay(), ws) }, (_, i) => <span key={'pad-' + i} aria-hidden="true" />)}
      {dates.map(date => {
        const iso = isoOf(date)
        const planned = effectiveRoutineIds(state, iso, today).length > 0
        const dot = doneDays.has(iso) ? 'done' : dayNoteOf(state, iso) ? 'noted'
          : planned && state.dayPlan[iso] !== undefined ? 'ovr'
            : planned || scheduledWorkoutOf(state, iso) ? 'plan' : ''
        const sport = sportDays.has(iso) ? 'done' : plannedSportsOn(state, iso, date.getDay()).length ? 'planned' : ''
        const recovery = recDays.has(iso) ? 'done' : datedActivitiesOn(state, iso, 'recovery').length ? 'planned' : ''
        const status = [
          dot && t(WORKOUT_MARK_LABEL[dot]),
          sport && t(sport === 'done' ? 'Sport logged' : 'Planned sport'),
          recovery && t(recovery === 'done' ? 'Recovery logged' : 'Planned recovery'),
        ]
        return <button key={iso} type="button" data-date={iso} className={'wday' + (iso === today ? ' today' : '')}
          aria-label={[fmtDate(iso, true, true), ...status].filter(Boolean).join(', ')}
          aria-current={iso === today ? 'date' : undefined} onClick={() => onDay(iso)}>
          {!monthly && <span className="lbl">{t(DAYS[date.getDay()])}</span>}
          <span className="num">{date.getDate()}</span>
          <span className="wday-marks">
            {(dot || (!sport && !recovery)) && <span className={dot ? 'dot ' + dot : 'dot'} />}
            {sport && <span className={'sport-mark ' + sport} />}
            {recovery && <span className={'recovery-mark ' + recovery} />}
          </span>
        </button>
      })}
    </div>
  </div>
}
