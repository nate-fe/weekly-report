import { useMemo, useState } from 'react'
import { today } from '../utils/dates'
import {
  buildMonthWeeks,
  tasksToCalendarEvents,
  placeEventsInWeek,
  isInSelectedWeek,
  groupEventsForDay,
} from '../utils/weeklyCalendar'
import CalendarEventModal from './CalendarEventModal'
import WeeklyDayModal from './WeeklyDayModal'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const LANE_HEIGHT = 10
const BAR_HEIGHT = 6
const MAX_LANES = 6
const MIN_EVENT_HEIGHT = LANE_HEIGHT + 2
const MIN_EMPTY_WEEK_HEIGHT = 28
const COL_WIDTH = 100 / 7

function monthFromDate(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}

export default function WeeklyCalendar({
  tasks = [],
  tabMembers = [],
  reportFrom = '',
  reportTo = '',
  alwaysShow = false,
}) {
  const initial = monthFromDate(reportFrom || today())
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const events = useMemo(
    () => tasksToCalendarEvents(tasks, tabMembers, reportFrom, reportTo),
    [tasks, tabMembers, reportFrom, reportTo]
  )

  const dayGroups = useMemo(
    () => (selectedDay ? groupEventsForDay(events, selectedDay, reportFrom, reportTo) : []),
    [events, selectedDay, reportFrom, reportTo]
  )

  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const goToReport = () => {
    if (!reportFrom) return
    const { year: y, month: m } = monthFromDate(reportFrom)
    setYear(y)
    setMonth(m)
  }

  if (!alwaysShow && !events.length) {
    return (
      <div className="gcal gcal-empty">
        <p>달력에 표시할 업무가 없습니다.</p>
        <p className="gcal-empty-hint">지난주·이번주·다음주 기간을 입력하면 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="gcal">
      <div className="gcal-toolbar">
        <div className="gcal-toolbar-left">
          <button type="button" className="gcal-nav-btn" onClick={prevMonth} aria-label="이전 달">‹</button>
          <button type="button" className="gcal-nav-btn" onClick={nextMonth} aria-label="다음 달">›</button>
          <div className="gcal-title-wrap">
            <h3 className="gcal-title">{year}년 {month}월</h3>
            <span className="gcal-title-hint">
              날짜를 클릭하면 팀원별 일일 업무를 확인할 수 있습니다
            </span>
          </div>
        </div>
      </div>

      <div className="gcal-weekdays">
        {WEEKDAYS.map(w => (
          <div key={w} className="gcal-weekday">{w}</div>
        ))}
      </div>

      <div className="gcal-body">
        {weeks.map((week, wi) => {
          const { segments, hiddenCount } = placeEventsInWeek(events, week.days, MAX_LANES, reportFrom, reportTo)
          const laneCount = events.length
            ? Math.max(MAX_LANES, segments.reduce((max, s) => Math.max(max, s.lane + 1), 0))
            : 0
          const eventAreaHeight = events.length
            ? Math.max(laneCount * LANE_HEIGHT + 4, MIN_EVENT_HEIGHT)
            : MIN_EMPTY_WEEK_HEIGHT
          return (
            <div key={wi} className="gcal-week">
              <div className="gcal-days">
                {week.days.map(day => (
                  <button
                    type="button"
                    key={day.dateStr}
                    className={[
                      'gcal-day',
                      !day.inMonth ? 'outside' : '',
                      day.isToday ? 'today' : '',
                      isInSelectedWeek(day.dateStr, reportFrom, reportTo) ? 'in-selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedDay(day.dateStr)}
                    aria-label={`${day.dateStr} 업무 보기`}
                  >
                    <span className={`gcal-day-num ${day.isToday ? 'is-today' : ''}`}>
                      {day.day}
                    </span>
                  </button>
                ))}
              </div>

              <div
                className={`gcal-events ${!events.length ? 'gcal-events-empty' : ''}`}
                style={{ height: eventAreaHeight }}
              >
                <div className="gcal-events-bg" aria-hidden="true">
                  {week.days.map(day => (
                    <div
                      key={day.dateStr}
                      className={[
                        'gcal-events-cell',
                        !day.inMonth ? 'outside' : '',
                        isInSelectedWeek(day.dateStr, reportFrom, reportTo) ? 'in-selected' : '',
                      ].filter(Boolean).join(' ')}
                    />
                  ))}
                </div>
                  {segments.map(ev => (
                    <button
                      type="button"
                      key={`${ev.id}-${ev.clipFrom}`}
                      className={[
                        `gcal-event tone-${ev.tone}`,
                        ev.isRangeStart ? 'seg-start' : '',
                        ev.isRangeEnd ? 'seg-end' : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        top: ev.lane * LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2,
                        left: `calc(${ev.startCol} * ${COL_WIDTH}% + 2px)`,
                        width: `calc(${ev.span} * ${COL_WIDTH}% - 4px)`,
                        height: BAR_HEIGHT,
                        '--member-color': ev.memberColor,
                      }}
                      title={ev.displayLabel}
                      aria-label={`${ev.displayLabel} · ${ev.workLabel}`}
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedEvent(ev)
                      }}
                    />
                  ))}
                </div>

              {hiddenCount > 0 && (
                <div className="gcal-more">+{hiddenCount}개 더 보기</div>
              )}
            </div>
          )
        })}
      </div>

      <CalendarEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <WeeklyDayModal
        dateStr={selectedDay}
        groups={dayGroups}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}
