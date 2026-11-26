import { useId, useMemo, useState } from 'react'
import { fmtDur, fmtNum, todayISO, weekStartOf } from '../lib/format.js'
import { t, tn } from '../lib/i18n.js'
import { RECOVERY_KINDS, RECOVERY_ICON, RECOVERY_LABEL } from '../lib/recovery-sessions.js'
import { recoveryStatistics } from '../lib/recovery-statistics.js'
import { RecoveryRow } from './RecoverySheet.jsx'
import SessionStatsPeriod from './SessionStatsPeriod.jsx'
import { Button, Row, SelectRow } from './ui.jsx'
import './sport-statistics.css'

const HISTORY_PAGE = 10
const duration = min => fmtDur(min * 60000)

function RecoveryHistory({ history }) {
  const [limit, setLimit] = useState(HISTORY_PAGE)
  return <>
    <ul role="list">
      {history.slice(0, limit).map(r => <li key={r.id}><RecoveryRow r={r} /></li>)}
    </ul>
    {history.length > limit && <Button size="sm" variant="ghost"
      onClick={() => setLimit(limit + HISTORY_PAGE)}>{t('Show more')}</Button>}
  </>
}

export default function RecoveryStatistics({ sessions, weekStart, initialPeriod = 'all' }) {
  const id = useId()
  const today = todayISO()
  const [kind, setKind] = useState('')
  const [period, setPeriod] = useState(initialPeriod)
  const [from, setFrom] = useState(() => today.slice(0, 7) + '-01')
  const [to, setTo] = useState(today)
  const ws = weekStartOf({ weekStart })
  const stats = useMemo(() => recoveryStatistics(sessions, { period, today, from, to, kind, weekStart: ws }),
    [sessions, period, today, from, to, kind, ws])
  const filterKey = [period, stats.from, stats.to, kind].join('/')

  return <section className="card session-stats" aria-labelledby={id} id="recovery-statistics" tabIndex={-1}>
    <h2 id={id}>{t('Recovery Statistics')}</h2>
    <div className="session-stats-filters">
      <SelectRow title={t('Recovery type')} value={kind} onChange={setKind}
        options={[{ value: '', label: t('All recovery types') }, ...RECOVERY_KINDS.map(k => ({ value: k, label: t(RECOVERY_LABEL[k]) }))]} />
      <SessionStatsPeriod period={period} onPeriod={setPeriod}
        today={today} from={from} to={to} onFrom={setFrom} onTo={setTo} />
    </div>
    <dl className="session-stats-totals" aria-live="polite">
      <div><dt>{t('Recovery sessions')}</dt><dd>{fmtNum(stats.n)}</dd></div>
      <div><dt>{t('Duration')}</dt><dd>{duration(stats.min)}</dd></div>
      <div><dt>{t('Recovery days')}</dt><dd>{fmtNum(stats.days)}</dd></div>
    </dl>
    {stats.kinds.length > 0 && <div>
      <h3>{t('Recovery type')}</h3>
      <ul role="list">
        {stats.kinds.map(k => <li key={k.kind}>
          <Row icon={RECOVERY_ICON[k.kind]} title={t(RECOVERY_LABEL[k.kind])}
            subtitle={tn('{0} recovery session', '{0} recovery sessions', k.n)} value={duration(k.min)}
            accessory={kind === k.kind ? 'check' : 'chevron'} onClick={() => setKind(k.kind)} />
        </li>)}
      </ul>
    </div>}
    <div className="session-stats-history">
      <h3>{t('History')}{kind && ' · ' + t(RECOVERY_LABEL[kind])}</h3>
      {stats.history.length ? <RecoveryHistory key={filterKey} history={stats.history} />
        : <p className="small muted" role="status">{t('No recovery sessions in this period')}</p>}
    </div>
  </section>
}
