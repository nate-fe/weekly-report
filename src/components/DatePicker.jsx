import { useState, useRef } from 'react'
import Calendar from './Calendar'
import PickerPopup from './PickerPopup'
import { fmtKo } from '../utils/dates'

export default function DatePicker({ value, onChange, placeholder = '날짜 선택' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const base = value ? new Date(value) : new Date()
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
    onChange(dateStr)
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
    setOpen(false)
  }

  return (
    <div className="picker" ref={ref}>
      <button type="button" className={`picker-trigger ${value ? 'has-value' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className="picker-icon">📅</span>
        <span>{value ? fmtKo(value) : placeholder}</span>
        {value && (
          <span className="picker-clear" onClick={clear} title="날짜 지우기">×</span>
        )}
      </button>
      <PickerPopup open={open} anchorRef={ref} onClose={() => setOpen(false)}>
        <Calendar
          year={view.year}
          month={view.month}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          mode="single"
          selected={value}
          onSelect={handleSelect}
        />
      </PickerPopup>
    </div>
  )
}
