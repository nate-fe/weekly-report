import { useMemo, useState } from 'react'
import { today } from '../utils/dates'
import {
  buildMonthWeeks,
  tasksToCalendarEvents,
  placeEventsInWeek,
  isInSelectedWeek,
  groupEventsForDay,
} from '../utils/weeklyCalendar'
import { isMeetingDay, meetingTooltipText } from '../utils/teamMeeting'
import { schedulesOnDate, canEditPersonalSchedule } from '../utils/personalSchedule'
import { normalizeEmployeeId } from '../utils/employeeId'
import CalendarEventModal from './CalendarEventModal'
import CalendarHiddenEventsModal from './CalendarHiddenEventsModal'
import WeeklyDayModal from './WeeklyDayModal'
import PersonalScheduleAddModal from './PersonalScheduleAddModal'
import PersonalScheduleDetailModal from './PersonalScheduleDetailModal'
import PersonalScheduleDayModal from './PersonalScheduleDayModal'
import ConfirmModal from './ConfirmModal'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const LANE_HEIGHT = 10
const BAR_HEIGHT = 6
const MAX_LANES = 6
const FIXED_EVENT_HEIGHT = MAX_LANES * LANE_HEIGHT + 4
const MIN_EMPTY_WEEK_HEIGHT = 28
const COL_WIDTH = 100 / 7

function monthFromDate(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m }
}

function scheduleTypesOnDay(schedules) {
  const types = new Set(schedules.map(s => s.type))
  return [...types]
}

function memberNameForEmployee(members, scheduleEmployeeId) {
  if (!scheduleEmployeeId) return ''
  const id = normalizeEmployeeId(scheduleEmployeeId)
  const member = (members || []).find(m => normalizeEmployeeId(m.employee_id) === id)
  return member?.name || id
}

export default function WeeklyCalendar({
  tasks = [],
  tabMembers = [],
  members = [],
  reportFrom = '',
  reportTo = '',
  meetingSettings = null,
  alwaysShow = false,
  employeeId = '',
  personalSchedules = [],
  canManageSchedules = false,
  onSaveSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
}) {
  const initial = monthFromDate(reportFrom || today())
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [hiddenEventsPopup, setHiddenEventsPopup] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [scheduleDay, setScheduleDay] = useState(null)
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null)
  const [scheduleBusy, setScheduleBusy] = useState(false)

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

  const openAddScheduleForm = () => {
    setEditingSchedule(null)
    setScheduleFormOpen(true)
  }

  const closeScheduleForm = () => {
    setScheduleFormOpen(false)
    setEditingSchedule(null)
  }

  const openEditScheduleForm = (schedule) => {
    if (!canEditPersonalSchedule(schedule, employeeId)) return
    setSelectedSchedule(null)
    setScheduleDay(null)
    setEditingSchedule(schedule)
    setScheduleFormOpen(true)
  }

  const openScheduleFromMarker = (dateStr, daySchedules) => {
    if (daySchedules.length === 1) {
      setScheduleDay(null)
      setSelectedSchedule(daySchedules[0])
      return
    }
    setSelectedSchedule(null)
    setScheduleDay({ dateStr, schedules: daySchedules })
  }

  const openScheduleDetail = (schedule) => {
    setScheduleDay(null)
    setSelectedSchedule(schedule)
  }

  const handleSaveSchedule = async (schedule) => {
    setScheduleBusy(true)
    try {
      if (editingSchedule) {
        if (!onUpdateSchedule) return
        if (!canEditPersonalSchedule(editingSchedule, employeeId)) return
        await onUpdateSchedule({
          ...schedule,
          employeeId: editingSchedule.employeeId || employeeId,
        })
      } else if (onSaveSchedule) {
        await onSaveSchedule(schedule)
      }
      closeScheduleForm()
    } finally {
      setScheduleBusy(false)
    }
  }

  const requestDeleteSchedule = (schedule) => {
    const target = schedule || selectedSchedule
    if (!target || !canEditPersonalSchedule(target, employeeId)) return
    setDeleteScheduleTarget(target)
  }

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleTarget || !onDeleteSchedule) return
    setScheduleBusy(true)
    try {
      await onDeleteSchedule(deleteScheduleTarget.id)
      setDeleteScheduleTarget(null)
      setSelectedSchedule(null)
      setScheduleDay(null)
    } finally {
      setScheduleBusy(false)
    }
  }

  if (!alwaysShow && !events.length) {
    return (
      <div className="gcal-wrap">
        <div className="gcal gcal-empty">
          <p>달력에 표시할 업무가 없습니다.</p>
          <p className="gcal-empty-hint">지난주·이번주·다음주 기간을 입력하면 표시됩니다.</p>
        </div>
        {canManageSchedules && (
          <button
            type="button"
            className="gcal-schedule-fab"
            onClick={openAddScheduleForm}
          >
            + 일정 추가
          </button>
        )}
        <PersonalScheduleAddModal
          open={scheduleFormOpen}
          schedule={editingSchedule}
          onClose={closeScheduleForm}
          onSave={handleSaveSchedule}
          saving={scheduleBusy}
        />
        <ConfirmModal
          open={!!deleteScheduleTarget}
          message={deleteScheduleTarget
            ? `"${deleteScheduleTarget.title}" 일정을 삭제할까요?`
            : ''}
          confirmLabel="삭제"
          onConfirm={confirmDeleteSchedule}
          onCancel={() => setDeleteScheduleTarget(null)}
        />
      </div>
    )
  }

  return (
    <div className="gcal-wrap">
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
          {personalSchedules.length > 0 && (
            <div className="gcal-schedule-legend">
              <span className="gcal-schedule-legend-item type-meeting">● 회의</span>
              <span className="gcal-schedule-legend-item type-live">● 라이브</span>
            </div>
          )}
        </div>

        <div className="gcal-weekdays">
          {WEEKDAYS.map(w => (
            <div key={w} className="gcal-weekday">{w}</div>
          ))}
        </div>

        <div className="gcal-body">
          {weeks.map((week, wi) => {
            const { segments, hiddenCountByCol, segmentsByCol } = placeEventsInWeek(
              events,
              week.days,
              MAX_LANES,
              reportFrom,
              reportTo
            )
            const hasEvents = events.length > 0
            const eventAreaHeight = hasEvents ? FIXED_EVENT_HEIGHT : MIN_EMPTY_WEEK_HEIGHT
            return (
              <div key={wi} className="gcal-week">
                <div className="gcal-days">
                  {week.days.map(day => {
                    const showMeeting = isMeetingDay(day.dateStr, meetingSettings)
                    const daySchedules = schedulesOnDate(personalSchedules, day.dateStr)
                    return (
                      <div
                        key={day.dateStr}
                        className={[
                          'gcal-day',
                          !day.inMonth ? 'outside' : '',
                          day.isToday ? 'today' : '',
                          isInSelectedWeek(day.dateStr, reportFrom, reportTo) ? 'in-selected' : '',
                          daySchedules.length ? 'has-schedule' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <span className="gcal-day-head">
                          <button
                            type="button"
                            className="gcal-day-trigger"
                            onClick={() => setSelectedDay(day.dateStr)}
                            aria-label={`${day.dateStr} 업무 보기`}
                          >
                            <span className={`gcal-day-num ${day.isToday ? 'is-today' : ''}`}>
                              {day.day}
                            </span>
                          </button>
                          {showMeeting && (
                            <span
                              className="gcal-meeting-check"
                              title={meetingTooltipText(meetingSettings, day.dateStr)}
                            >
                              ✓
                            </span>
                          )}
                          {daySchedules.length > 0 && (
                            <button
                              type="button"
                              className="gcal-schedule-marker"
                              title={`회의·라이브 일정 ${daySchedules.length}건`}
                              aria-label={`${day.dateStr} 회의·라이브 일정 ${daySchedules.length}건`}
                              onClick={() => openScheduleFromMarker(day.dateStr, daySchedules)}
                            >
                              <span className="gcal-schedule-marker-dots" aria-hidden="true">
                                {scheduleTypesOnDay(daySchedules).map(type => (
                                  <span key={type} className={`gcal-schedule-dot type-${type}`} />
                                ))}
                              </span>
                              {daySchedules.length > 1 && (
                                <span className="gcal-schedule-marker-count">{daySchedules.length}</span>
                              )}
                            </button>
                          )}
                        </span>
                      </div>
                    )
                  })}
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
                  {hasEvents && week.days.map((day, col) => {
                    const hidden = hiddenCountByCol[col]
                    if (!hidden) return null
                    return (
                      <button
                        type="button"
                        key={`more-${day.dateStr}`}
                        className="gcal-more"
                        style={{
                          left: `calc(${col} * ${COL_WIDTH}% + 2px)`,
                          width: `calc(${COL_WIDTH}% - 4px)`,
                        }}
                        onClick={() => setHiddenEventsPopup({
                          dateStr: day.dateStr,
                          segments: segmentsByCol[col],
                        })}
                        aria-label={`${day.dateStr} 업무 ${segmentsByCol[col].length}건 보기`}
                      >
                        +{hidden}개 더 보기
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <CalendarEventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        <CalendarHiddenEventsModal
          dateStr={hiddenEventsPopup?.dateStr}
          segments={hiddenEventsPopup?.segments || []}
          onClose={() => setHiddenEventsPopup(null)}
          onSelectEvent={ev => {
            setHiddenEventsPopup(null)
            setSelectedEvent(ev)
          }}
        />
        <WeeklyDayModal
          dateStr={selectedDay}
          groups={dayGroups}
          tabMembers={tabMembers}
          onClose={() => setSelectedDay(null)}
        />
      </div>

      {canManageSchedules && (
        <button
          type="button"
          className="gcal-schedule-fab"
          onClick={openAddScheduleForm}
        >
          + 일정 추가
        </button>
      )}

      <PersonalScheduleAddModal
        open={scheduleFormOpen}
        schedule={editingSchedule}
        onClose={closeScheduleForm}
        onSave={handleSaveSchedule}
        saving={scheduleBusy}
      />

      <PersonalScheduleDetailModal
        schedule={selectedSchedule}
        ownerName={memberNameForEmployee(members, selectedSchedule?.employeeId)}
        canEdit={canEditPersonalSchedule(selectedSchedule, employeeId)}
        onClose={() => setSelectedSchedule(null)}
        onEdit={openEditScheduleForm}
        onDelete={() => requestDeleteSchedule()}
        busy={scheduleBusy}
      />

      <PersonalScheduleDayModal
        dateStr={scheduleDay?.dateStr}
        schedules={scheduleDay?.schedules || []}
        employeeId={employeeId}
        members={members}
        onClose={() => setScheduleDay(null)}
        onSelect={openScheduleDetail}
        onEdit={openEditScheduleForm}
        onDelete={requestDeleteSchedule}
        busy={scheduleBusy}
      />

      <ConfirmModal
        open={!!deleteScheduleTarget}
        message={deleteScheduleTarget
          ? `"${deleteScheduleTarget.title}" 일정을 삭제할까요?`
          : ''}
        confirmLabel="삭제"
        onConfirm={confirmDeleteSchedule}
        onCancel={() => setDeleteScheduleTarget(null)}
      />
    </div>
  )
}
