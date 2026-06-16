import { addDays, fmt, normalizeDateStr } from './dates'

export const MEETING_TOOLTIP = 'UI팀 주간회의'

export const WEEKDAY_OPTIONS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
]

export const DEFAULT_TEAM_MEETING = {
  meetingDay: 3,
  meetingTime: '14:00',
  exceptions: [],
}

let _uid = Date.now()
export function meetingExceptionUid() {
  return String(++_uid)
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sundayOfWeek(dateStr) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() - d.getDay())
  return fmt(d)
}

export function normalizeException(ex) {
  const date = normalizeDateStr(ex?.date)
  if (!date) return null
  const time = (ex?.time || '').trim()
  return {
    id: ex?.id || meetingExceptionUid(),
    date,
    time: time || '',
  }
}

export function normalizeTeamMeetingSettings(raw) {
  const meetingDay = Number(raw?.meetingDay ?? raw?.meeting_day ?? DEFAULT_TEAM_MEETING.meetingDay)
  const meetingTime = (raw?.meetingTime ?? raw?.meeting_time ?? DEFAULT_TEAM_MEETING.meetingTime).trim()
    || DEFAULT_TEAM_MEETING.meetingTime
  const exceptionsRaw = raw?.exceptions ?? []
  const exceptions = (Array.isArray(exceptionsRaw) ? exceptionsRaw : [])
    .map(normalizeException)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    meetingDay: WEEKDAY_OPTIONS.some(o => o.value === meetingDay) ? meetingDay : DEFAULT_TEAM_MEETING.meetingDay,
    meetingTime,
    exceptions,
  }
}

/** 해당 날짜가 주간회의일인지 (예외 주는 기본 요일 대신 표시) */
export function isMeetingDay(dateStr, settings) {
  const date = normalizeDateStr(dateStr)
  if (!date) return false

  const { meetingDay, exceptions } = normalizeTeamMeetingSettings(settings)
  if (exceptions.some(ex => ex.date === date)) return true

  if (parseDate(date).getDay() !== meetingDay) return false

  const weekSun = sundayOfWeek(date)
  const weekSat = addDays(weekSun, 6)
  const hasExceptionInWeek = exceptions.some(ex => ex.date >= weekSun && ex.date <= weekSat)
  return !hasExceptionInWeek
}

export function weekdayLabel(day) {
  return WEEKDAY_OPTIONS.find(o => o.value === day)?.label || '수요일'
}
