import { useMemo } from 'react'
import { today } from '../utils/dates'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isInRange(dateStr, from, to) {
  if (!from || !to) return false
  const [a, b] = from <= to ? [from, to] : [to, from]
  return dateStr >= a && dateStr <= b
}

export default function Calendar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  mode = 'single',
  selected,
  rangeFrom = '',
  rangeTo = '',
  onSelect,
}) {
  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const pad = new Date(year, month - 1, 1).getDay() // 일요일 시작 (0=일)
    const items = []

    for (let i = 0; i < pad; i++) items.push({ type: 'pad' })
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ type: 'day', day: d, dateStr: toDateStr(year, month, d) })
    }
    return items
  }, [year, month])

  return (
    <div className="cal">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={onPrevMonth}>‹</button>
        <span className="cal-title">{year}년 {month}월</span>
        <button type="button" className="cal-nav" onClick={onNextMonth}>›</button>
      </div>
      <div className="cal-weekdays">
        {WEEKDAYS.map(w => <span key={w} className="cal-weekday">{w}</span>)}
      </div>
      <div className="cal-grid">
        {cells.map((cell, i) => {
          if (cell.type === 'pad') return <span key={`p${i}`} className="cal-pad" />

          const { dateStr, day } = cell
          const rangeEnd = rangeTo || rangeFrom
          const isSelected = mode === 'single'
            ? selected === dateStr
            : dateStr === rangeFrom || dateStr === rangeEnd
          const inRange = mode === 'range' && rangeFrom && (
            rangeFrom === rangeEnd
              ? dateStr === rangeFrom
              : isInRange(dateStr, rangeFrom, rangeEnd)
          )
          const isToday = dateStr === today()

          return (
            <button
              key={dateStr}
              type="button"
              className={[
                'cal-day',
                isSelected ? 'selected' : '',
                inRange ? 'in-range' : '',
                isToday ? 'today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(dateStr)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
