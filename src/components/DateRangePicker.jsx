import { useState, useRef } from 'react'
import Calendar from './Calendar'
import PickerPopup from './PickerPopup'
import { fmtRangeShort } from '../utils/weeklyTask'

export default function DateRangePicker({ from, to, onChange, placeholder = '기간 선택' }) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState('from')
  const [view, setView] = useState(() => {
    const base = from ? new Date(from) : new Date()
    return { year: base.getFullYear(), month: base.getMonth() + 1 }
  })
  const ref = useRef(null)

  const prevMonth = () => setView(v => {
    if (v.month === 1) return { year: v.year - 1, month: 12 }
    return { ...v, month: v.month - 1 }
  })

  const nextMonth = () => setView(v => {
    if (v.month === 12) return { year: v.year + 1, month: 1 }
    return { ...v, month: v.month + 1 }
  })

  const handleSelect = (dateStr) => {
    // 첫 클릭: 해당 날짜 하루만 작업한 것으로 처리
    if (picking === 'from' || !from) {
      onChange({ from: dateStr, to: dateStr })
      setPicking('to')
      return
    }
    // 같은 날 재클릭: 하루 선택 확정
    if (dateStr === from && from === to) {
      setPicking('from')
      setOpen(false)
      return
    }
    // 다른 날 클릭: 기간으로 확장
    const [a, b] = dateStr < from ? [dateStr, from] : [from, dateStr]
    onChange({ from: a, to: b })
    setPicking('from')
    setOpen(false)
  }

  const handleClose = () => {
    setOpen(false)
    setPicking('from')
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange({ from: '', to: '' })
    setPicking('from')
    setOpen(false)
  }

  const label = fmtRangeShort(from, to) || placeholder

  return (
    <div className="picker" ref={ref}>
      <button
        type="button"
        className={`picker-trigger ${from || to ? 'has-value' : ''}`}
        onClick={() => setOpen(o => {
          if (!o) setPicking('from')
          return !o
        })}
      >
        <span className="picker-icon">📅</span>
        <span>{label}</span>
        {(from || to) && (
          <span className="picker-clear" onClick={clear} title="기간 지우기">×</span>
        )}
      </button>
      <PickerPopup open={open} anchorRef={ref} onClose={handleClose}>
        <div className="picker-hint">
          {picking === 'from' || !from
            ? '날짜를 선택하세요 (하루만 선택 가능)'
            : '다른 날짜를 선택하면 기간으로 설정됩니다'}
        </div>
        <Calendar
          year={view.year}
          month={view.month}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          mode="range"
          rangeFrom={from}
          rangeTo={to}
          onSelect={handleSelect}
        />
      </PickerPopup>
    </div>
  )
}
