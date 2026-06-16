/** "YYYY-MM-DD" 또는 ISO·DB 날짜 문자열 → "YYYY-MM-DD" */
export function normalizeDateStr(val) {
  if (!val) return ''
  if (typeof val === 'string') {
    const m = val.trim().match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }
  return ''
}

/** Date object → "YYYY-MM-DD" (로컬 시간 기준) */
export function fmt(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 오늘 날짜 문자열 */
export function today() {
  return fmt(new Date())
}

/** 오늘보다 이전 날짜인지 (지난 날은 편집 불가) */
export function isPastDate(dateStr) {
  const d = normalizeDateStr(dateStr)
  if (!d) return false
  return d < today()
}

/** "YYYY-MM-DD" → "YYYY년 M월 D일" */
export function fmtKo(str) {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${y}년 ${+m}월 ${+d}일`
}

/** 주 키: "YYYY-Www" (ISO week) */
export function weekKey(dateStr) {
  const d = new Date(dateStr)
  const thursday = new Date(d)
  thursday.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNum = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7)
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** 주어진 날짜가 속한 주의 월요일 */
function mondayOf(dateStr) {
  const d = new Date(dateStr)
  const dow = d.getDay() || 7
  d.setDate(d.getDate() - dow + 1)
  return d
}

/** 주어진 날짜가 속한 주의 일요일 */
function sundayOf(dateStr) {
  const d = new Date(dateStr)
  const dow = d.getDay() || 7
  d.setDate(d.getDate() - dow + 7)
  return d
}

/** 날짜 문자열에 일수 더하기 */
export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return fmt(date)
}

/** 주차 사이드바 표시: 전주 일요일 ~ 이번주 토요일 (인자: 해당 주 월요일) */
export function weekSidebarRange(weekMonday) {
  return {
    from: addDays(weekMonday, -1),
    to: addDays(weekMonday, 5),
  }
}

/** "M/D ~ M/D" (주차 목록용) */
export function fmtWeekSidebarRange(weekMonday) {
  const { from, to } = weekSidebarRange(weekMonday)
  const md = s => {
    const [, m, d] = s.split('-')
    return `${+m}/${+d}`
  }
  return `${md(from)} ~ ${md(to)}`
}

/**
 * 해당 월에 걸쳐 있는 모든 주 반환
 * (월요일 기준, 월과 겹치는 주 전부 포함)
 */
export function weeksInMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)

  const weeks = []
  const cursor = mondayOf(fmt(firstDay))

  while (cursor <= lastDay) {
    const mon = new Date(cursor)
    const sun = new Date(cursor)
    sun.setDate(cursor.getDate() + 6)

    const monStr = fmt(mon)
    weeks.push({
      key:  weekKey(monStr),
      from: monStr,
      to:   fmt(sun),
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

/** 주어진 날짜가 속한 주의 ISO week key에서 N주 이동 */
export function offsetWeekKey(fromDateStr, weeksDelta) {
  const d = new Date(fromDateStr)
  d.setDate(d.getDate() + weeksDelta * 7)
  return weekKey(fmt(d))
}

/** 바로 전주 week key */
export function prevWeekKey(fromDateStr) {
  return offsetWeekKey(fromDateStr, -1)
}

/**
 * 기본 보고 기간: 지난 목요일 ~ 이번 수요일
 */
export function defaultReportPeriod() {
  const t   = new Date()
  const dow = t.getDay()
  const toWed = (3 - dow + 7) % 7
  const wed = new Date(t); wed.setDate(t.getDate() + toWed)
  const thu = new Date(wed); thu.setDate(wed.getDate() - 6)
  return { from: fmt(thu), to: fmt(wed) }
}
