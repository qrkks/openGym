import { t } from '../lib/i18n.js'
import DateField from './DateField.jsx'
import { Row, SelectRow } from './ui.jsx'

const PERIODS = { all: 'All dates', week: 'This week', month: 'This month', year: 'This year', custom: 'Custom' }

export default function SessionStatsPeriod({ period, onPeriod, today, from, to, onFrom, onTo }) {
  return <>
    <SelectRow title={t('Period')} value={period} onChange={onPeriod}
      options={Object.entries(PERIODS).map(([value, label]) => ({ value, label: t(label) }))} />
    {period === 'custom' && <>
      <Row title={t('From')}><DateField compact value={from} max={to} onChange={onFrom} label={t('From')} /></Row>
      <Row title={t('To')}><DateField compact value={to} min={from} max={today} onChange={onTo} label={t('To')} /></Row>
    </>}
  </>
}
