import { useEffect, useMemo, useState } from 'react'
import { today } from '../utils/dates'
import { buildMonthWeeks, summarizeDay, dayTasksGrouped, countDailySubmissions } from '../utils/dailyCalendar'
import { normalizeMemberColor } from '../utils/members'
import DailyDayModal from './DailyDayModal'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function monthFromDate(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}

export default function DailyCalendar({
  tasksByDate = {},
  memberMap = {},
  activeMemberIds = [],
  highlightDate = '',
  onMonthChange,
  onGoToDate,
}) {
  const initial = monthFromDate(highlightDate || today())
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [modalDate, setModalDate] = useState(null)

  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month])

  useEffect(() => {
    onMonthChange?.(year, month)
  }, [year, month, onMonthChange])

  const modalGroups = useMemo(
    () => (modalDate ? dayTasksGrouped(tasksByDate[modalDate] || {}, memberMap) : []),
    [modalDate, tasksByDate, memberMap]
  )

  const modalSubmission = useMemo(
    () => countDailySubmissions(modalDate ? tasksByDate[modalDate] : {}, activeMemberIds),
    [modalDate, tasksByDate, activeMemberIds]
  )

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const goToToday = () => {
    const { year: y, month: m } = monthFromDate(today())
    setYear(y)
    setMonth(m)
  }

  const handleGoToDate = (dateStr) => {
    setModalDate(null)
    onGoToDate?.(dateStr)
  }

  return (
    <div className="dcal">
      <div className="gcal-toolbar">
        <div className="gcal-toolbar-left">
          <button type="button" className="gcal-nav-btn" onClick={prevMonth} aria-label="이전 달">‹</button>
          <button type="button" className="gcal-nav-btn" onClick={nextMonth} aria-label="다음 달">›</button>
          <h3 className="gcal-title">{year}년 {month}월</h3>
        </div>
      </div>

      <div className="gcal-weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className="gcal-weekday">{w}</div>
        ))}
      </div>

      <div className="dcal-body">
        {weeks.map((week, wi) => (
          <div key={wi} className="dcal-week">
            {week.days.map(day => {
              const summary = summarizeDay(tasksByDate[day.dateStr])
              const submission = countDailySubmissions(tasksByDate[day.dateStr], activeMemberIds)
              const isSelected = day.dateStr === highlightDate
              const dots = summary.memberIds.slice(0, 4)

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  className={[
                    'dcal-day',
                    !day.inMonth ? 'outside' : '',
                    day.isToday ? 'today' : '',
                    isSelected ? 'selected' : '',
                    summary.total > 0 ? 'has-tasks' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setModalDate(day.dateStr)}
                >
                  <span className={`dcal-day-num ${day.isToday ? 'is-today' : ''}`}>
                    {day.day}
                  </span>
                  {day.inMonth && activeMemberIds.length > 0 && (
                    <span className="dcal-day-submit">
                      {submission.submitted}/{submission.total}명
                    </span>
                  )}
                  {summary.total > 0 && (
                    <div className="dcal-day-dots">
                      {dots.map(mid => (
                        <span
                          key={mid}
                          className="dcal-day-dot"
                          style={{ background: normalizeMemberColor(memberMap[mid]?.color) }}
                        />
                      ))}
                      {summary.memberIds.length > 4 && (
                        <span className="dcal-day-more">+{summary.memberIds.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <DailyDayModal
        dateStr={modalDate}
        groups={modalGroups}
        submittedCount={modalSubmission.submitted}
        totalMembers={modalSubmission.total}
        onClose={() => setModalDate(null)}
        onGoToDate={onGoToDate ? handleGoToDate : undefined}
      />
    </div>
  )
}
