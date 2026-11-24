import { useId, useMemo, useState } from 'react'
import { SPORTS, SPORT_ICON, SPORT_LABEL, activityName } from '../lib/activities.js'
import { MONTHS, fmtDate, fmtDateRange, fmtDur, fmtNum, todayISO, weekStartOf } from '../lib/format.js'
import { t, tn } from '../lib/i18n.js'
import { sportStatistics, sportTrend } from '../lib/sport-statistics.js'
import DateField from './DateField.jsx'
import { Button, Row, Segmented, SelectRow } from './ui.jsx'
import './sport-statistics.css'

const PERIODS = { all: 'All dates', week: 'This week', month: 'This month', year: 'This year', custom: 'Custom' }
const TREND_PAGE = 6
const HISTORY_PAGE = 10
const duration = min => fmtDur(min * 60000)
const sessions = n => tn('{0} session', '{0} sessions', n)

function SportTrend({ buckets, grouping }) {
  const [offset, setOffset] = useState(0)
  const end = Math.max(1, buckets.length - offset)
  const start = Math.max(0, end - TREND_PAGE)
  const visible = buckets.slice(start, end)
  const peak = buckets.reduce((max, b) => Math.max(max, b.n), 1)
  if (!visible.length) return null

  return <>
    <ol className="sport-trend" role="list" aria-label={t('Sessions')}>
      {visible.map(b => <li key={b.key}>
        <span className="vh">{fmtDateRange(b.from, b.to)} · {sessions(b.n)}</span>
        <div className="sport-trend-visual" aria-hidden="true">
          <span className="sport-trend-plot">
            <span className="sport-trend-bar" style={{ '--sport-bar-height': (100 * b.n / peak) + '%' }}>
              <span className="sport-trend-count">{fmtNum(b.n)}</span>
            </span>
          </span>
          <span className="sport-trend-label small muted">
            {grouping === 'week' ? fmtDate(b.from) : t(MONTHS[Number(b.key.slice(5, 7)) - 1])}
          </span>
        </div>
      </li>)}
    </ol>
    <div className="sport-trend-pager">
      {buckets.length > TREND_PAGE && <Button size="sm" variant="ghost" disabled={start === 0}
        onClick={() => setOffset(offset + TREND_PAGE)}>{t('Previous')}</Button>}
      <span className="small muted" aria-live="polite">{fmtDateRange(visible[0].from, visible[visible.length - 1].to)}</span>
      {buckets.length > TREND_PAGE && <Button size="sm" variant="ghost" disabled={offset === 0}
        onClick={() => setOffset(offset - TREND_PAGE)}>{t('Next')}</Button>}
    </div>
  </>
}

function SportHistory({ history }) {
  const [limit, setLimit] = useState(HISTORY_PAGE)
  return <>
    <ul className="sport-history" role="list">
      {history.slice(0, limit).map(a => <li key={a.id}>
        <Row icon={SPORT_ICON[a.sport]} title={activityName(a, t)} value={duration(a.min)}
          subtitle={[fmtDate(a.d, false, true), a.title && t(SPORT_LABEL[a.sport])].filter(Boolean).join(' · ')} />
      </li>)}
    </ul>
    {history.length > limit && <Button size="sm" variant="ghost"
      onClick={() => setLimit(limit + HISTORY_PAGE)}>{t('Show more')}</Button>}
  </>
}

export default function SportStatistics({ activities, weekStart }) {
  const id = useId()
  const today = todayISO()
  const [sport, setSport] = useState('')
  const [period, setPeriod] = useState('all')
  const [group, setGroup] = useState('')
  const [from, setFrom] = useState(() => today.slice(0, 7) + '-01')
  const [to, setTo] = useState(today)
  const grouping = group || (period === 'week' || period === 'month' ? 'week' : 'month')
  const ws = weekStartOf({ weekStart })
  const stats = useMemo(() => sportStatistics({ activities }, { period, today, from, to, sport, weekStart: ws }),
    [activities, period, today, from, to, sport, ws])
  const buckets = useMemo(() => stats.n ? sportTrend(stats, grouping, ws) : [], [stats, grouping, ws])
  const filterKey = [period, stats.from, stats.to, sport, ws].join('/')
  const title = t('Sport Statistics')

  return <section className="card sport-stats" aria-labelledby={id} id="sport-statistics">
    <h2 id={id}>{title}</h2>
    <div className="sport-stats-filters">
      <SelectRow title={t('Sport')} value={sport} onChange={setSport}
        options={[{ value: '', label: t('All sports') }, ...SPORTS.map(s => ({ value: s, label: t(SPORT_LABEL[s]) }))]} />
      <SelectRow title={t('Period')} value={period} onChange={p => { setPeriod(p); setGroup('') }}
        options={Object.entries(PERIODS).map(([value, label]) => ({ value, label: t(label) }))} />
      {period === 'custom' && <>
        <Row title={t('From')}><DateField compact value={from} max={to} onChange={setFrom} label={t('From')} /></Row>
        <Row title={t('To')}><DateField compact value={to} min={from} max={today} onChange={setTo} label={t('To')} /></Row>
      </>}
    </div>
    <dl className="sport-stats-totals" aria-live="polite">
      <div><dt>{t('Sessions')}</dt><dd>{fmtNum(stats.n)}</dd></div>
      <div><dt>{t('Duration')}</dt><dd>{duration(stats.min)}</dd></div>
      <div><dt>{t('Training days')}</dt><dd>{fmtNum(stats.days)}</dd></div>
    </dl>

    {stats.n > 0 && <div className="sport-trend-section">
      <h3 id={id + '-trend'}>{t('Sessions')}</h3>
      <Segmented ariaLabelledby={id + '-trend'} value={grouping} onChange={setGroup} options={[
        { value: 'week', label: t('Weekly') }, { value: 'month', label: t('Monthly') },
      ]} />
      <SportTrend key={filterKey + '/' + grouping} buckets={buckets} grouping={grouping} />
    </div>}

    {stats.sports.length > 0 && <div className="sport-stats-breakdown">
      <h3>{t('Sport')}</h3>
      <ul role="list">
        {stats.sports.map(s => <li key={s.sport}>
          <Row icon={SPORT_ICON[s.sport]} title={t(SPORT_LABEL[s.sport])} subtitle={sessions(s.n)}
            value={duration(s.min)} accessory={sport === s.sport ? 'check' : 'chevron'} onClick={() => setSport(s.sport)} />
        </li>)}
      </ul>
    </div>}

    <div className="sport-stats-history">
      <h3>{t('History')}{sport && ' · ' + t(SPORT_LABEL[sport])}</h3>
      {stats.history.length ? <SportHistory key={filterKey} history={stats.history} />
        : <p className="small muted" role="status">{t('No sport activities in this period')}</p>}
    </div>
  </section>
}
